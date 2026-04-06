<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { parseMockGameContext, buildGameLevels } from '@/utils/mockGameQuiz'

const route = useRoute()
const router = useRouter()

const context = computed(() => parseMockGameContext(route.query))
const levels = computed(() => buildGameLevels(context.value))

const TIMER_SECONDS = 30

const phase = ref('map')
const currentLevel = ref(0)
const currentQuestion = ref(0)
const selectedOption = ref(-1)
const score = ref(0)
const combo = ref(0)
const maxCombo = ref(0)
const hearts = ref(3)
const timer = ref(TIMER_SECONDS)
const showHint = ref(false)
const answeredQuestions = ref([])
const levelResults = ref([])
let timerInterval = null

const level = computed(() => levels.value[currentLevel.value])
const question = computed(() => level.value?.questions?.[currentQuestion.value])
const answeredCount = computed(() => answeredQuestions.value.length)
const accuracy = computed(() => {
  if (!answeredCount.value) return 0
  return Math.round((answeredQuestions.value.filter(a => a.correct).length / answeredCount.value) * 100)
})

const startTimer = () => {
  clearInterval(timerInterval)
  timer.value = TIMER_SECONDS
  timerInterval = setInterval(() => {
    timer.value--
    if (timer.value <= 0) { clearInterval(timerInterval); handleTimeout() }
  }, 1000)
}
const stopTimer = () => clearInterval(timerInterval)

const handleTimeout = () => {
  selectedOption.value = -2
  combo.value = 0
  hearts.value = Math.max(0, hearts.value - 1)
  answeredQuestions.value.push({ levelIdx: currentLevel.value, qIdx: currentQuestion.value, correct: false, timeout: true })
  phase.value = 'feedback'
}

const startLevel = (idx) => {
  currentLevel.value = idx
  currentQuestion.value = 0
  selectedOption.value = -1
  showHint.value = false
  phase.value = 'playing'
  startTimer()
}

const selectAnswer = (idx) => {
  if (phase.value !== 'playing' || selectedOption.value >= 0) return
  stopTimer()
  selectedOption.value = idx
  const isCorrect = idx === question.value.correctIndex
  if (isCorrect) {
    score.value += question.value.baseScore + Math.floor(timer.value * 2) + combo.value * 5
    combo.value++
    if (combo.value > maxCombo.value) maxCombo.value = combo.value
  } else {
    combo.value = 0
    hearts.value = Math.max(0, hearts.value - 1)
  }
  answeredQuestions.value.push({ levelIdx: currentLevel.value, qIdx: currentQuestion.value, correct: isCorrect, timeout: false })
  phase.value = 'feedback'
}

const nextStep = () => {
  if (hearts.value <= 0) { phase.value = 'gameover'; return }
  if (currentQuestion.value < level.value.questions.length - 1) {
    currentQuestion.value++
    selectedOption.value = -1
    showHint.value = false
    phase.value = 'playing'
    startTimer()
  } else {
    const correct = answeredQuestions.value.filter(a => a.levelIdx === currentLevel.value && a.correct).length
    const total = level.value.questions.length
    levelResults.value.push({
      levelIdx: currentLevel.value, correct, total,
      stars: correct === total ? 3 : correct >= total * 0.66 ? 2 : correct >= 1 ? 1 : 0,
    })
    phase.value = currentLevel.value < levels.value.length - 1 ? 'level-clear' : 'gameover'
  }
}

const continueToNextLevel = () => startLevel(currentLevel.value + 1)
const restartGame = () => {
  score.value = 0; combo.value = 0; maxCombo.value = 0; hearts.value = 3
  answeredQuestions.value = []; levelResults.value = []; phase.value = 'map'
}
const backToLesson = () => {
  router.push({ path: '/lesson/player', query: { courseId: route.query.courseId, lessonId: route.query.lessonId } })
}

const timerPct = computed(() => (timer.value / TIMER_SECONDS) * 100)
const timerColor = computed(() => timer.value > 20 ? '#10b981' : timer.value > 10 ? '#f59e0b' : '#ef4444')
const isLevelUnlocked = (idx) => idx === 0 || levelResults.value.some(r => r.levelIdx === idx - 1)
const getLevelStars = (idx) => levelResults.value.find(r => r.levelIdx === idx)?.stars ?? -1

onBeforeUnmount(() => stopTimer())
</script>

<template>
  <div class="game-page">
    <!-- Top bar -->
    <header class="game-topbar">
      <div class="topbar-left">
        <button class="back-btn" @click="backToLesson">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          返回课堂
        </button>
        <div class="topbar-divider" />
        <div class="topbar-info">
          <span class="topbar-course">{{ context.courseName }}</span>
          <span class="topbar-section">{{ context.sectionTitle }}</span>
        </div>
      </div>
      <div class="topbar-right">
        <div class="stat-hearts">
          <span v-for="i in 3" :key="i" :class="['heart', { lost: i > hearts }]">
            <svg width="16" height="16" viewBox="0 0 24 24" :fill="i <= hearts ? '#f43f5e' : '#e2e8f0'" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </span>
        </div>
        <div class="stat-score">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          {{ score }}
        </div>
        <transition name="combo-pop">
          <div v-if="combo > 1" class="stat-combo">{{ combo }}x 连击</div>
        </transition>
      </div>
    </header>

    <!-- ═══ MAP ═══ -->
    <div v-if="phase === 'map'" class="phase-map">
      <div class="map-hero">
        <div class="map-hero-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z" /><path d="M9.5 12.5l1.7 1.7 3.3-4.2" /></svg>
        </div>
        <div>
          <h1 class="map-title">练习闯关</h1>
          <p class="map-sub">根据「{{ context.sectionTitle }}」智能生成的挑战题库，检验你的掌握程度</p>
        </div>
      </div>

      <div class="level-grid">
        <button
          v-for="(lv, idx) in levels"
          :key="lv.id"
          :class="['level-card', {
            locked: !isLevelUnlocked(idx),
            cleared: getLevelStars(idx) >= 0,
            current: isLevelUnlocked(idx) && getLevelStars(idx) < 0,
          }]"
          :disabled="!isLevelUnlocked(idx)"
          @click="startLevel(idx)"
        >
          <div class="lc-top">
            <span class="lc-icon">{{ lv.icon }}</span>
            <span v-if="!isLevelUnlocked(idx)" class="lc-lock">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <span v-else-if="getLevelStars(idx) >= 0" class="lc-check">✓</span>
          </div>
          <div class="lc-name">{{ lv.name }}</div>
          <div class="lc-desc">{{ lv.desc }}</div>
          <div v-if="getLevelStars(idx) >= 0" class="lc-stars">
            <span v-for="s in 3" :key="s" :class="['lc-star', { filled: s <= getLevelStars(idx) }]">★</span>
          </div>
          <div v-else-if="isLevelUnlocked(idx)" class="lc-cta">开始挑战</div>
          <div class="lc-badge">第{{ idx + 1 }}关</div>
        </button>
      </div>
    </div>

    <!-- ═══ PLAYING / FEEDBACK ═══ -->
    <div v-else-if="phase === 'playing' || phase === 'feedback'" class="phase-play">
      <div class="play-container">
        <!-- Progress bar -->
        <div class="progress-bar-wrap">
          <div class="pb-level">{{ level.icon }} {{ level.name }}</div>
          <div class="pb-track">
            <div
              v-for="(q, qi) in level.questions"
              :key="q.id"
              :class="['pb-segment', {
                current: qi === currentQuestion && phase === 'playing',
                correct: answeredQuestions.some(a => a.levelIdx === currentLevel && a.qIdx === qi && a.correct),
                wrong: answeredQuestions.some(a => a.levelIdx === currentLevel && a.qIdx === qi && !a.correct),
              }]"
            >
              <span class="pb-num">{{ qi + 1 }}</span>
            </div>
          </div>
        </div>

        <div class="question-layout">
          <!-- Timer + Question -->
          <div class="q-main">
            <div v-if="phase === 'playing'" class="timer-bar">
              <div class="timer-fill" :style="{ width: timerPct + '%', background: timerColor }" />
              <span class="timer-label" :style="{ color: timerColor }">{{ timer }}s</span>
            </div>

            <div class="q-card">
              <span class="q-kp">{{ question.knowledgePoint }}</span>
              <h2 class="q-text">{{ question.question }}</h2>

              <div class="options-list">
                <button
                  v-for="(opt, oi) in question.options"
                  :key="oi"
                  :class="['opt-btn', {
                    selected: selectedOption === oi && phase === 'playing',
                    correct: phase === 'feedback' && oi === question.correctIndex,
                    wrong: phase === 'feedback' && selectedOption === oi && oi !== question.correctIndex,
                    dimmed: phase === 'feedback' && oi !== question.correctIndex && oi !== selectedOption,
                  }]"
                  :disabled="phase === 'feedback'"
                  @click="selectAnswer(oi)"
                >
                  <span class="opt-key">{{ ['A', 'B', 'C', 'D'][oi] }}</span>
                  <span class="opt-label">{{ opt }}</span>
                  <svg v-if="phase === 'feedback' && oi === question.correctIndex" class="opt-result-icon correct" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
                  <svg v-if="phase === 'feedback' && selectedOption === oi && oi !== question.correctIndex" class="opt-result-icon wrong" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              <button v-if="phase === 'playing' && !showHint" class="hint-toggle" @click="showHint = true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                查看提示
              </button>
              <div v-if="showHint" class="hint-box">💡 {{ question.hint }}</div>
            </div>

            <!-- Feedback -->
            <div v-if="phase === 'feedback'" class="feedback-bar">
              <div :class="['fb-content', selectedOption === question.correctIndex ? 'fb-correct' : 'fb-wrong']">
                <div class="fb-left">
                  <span class="fb-emoji">{{ selectedOption === question.correctIndex ? '🎉' : (selectedOption === -2 ? '⏰' : '💡') }}</span>
                  <div>
                    <div class="fb-title">{{ selectedOption === question.correctIndex ? '回答正确！' : (selectedOption === -2 ? '时间到！' : '答错了，没关系') }}</div>
                    <div v-if="selectedOption === question.correctIndex && combo > 1" class="fb-detail">连续答对 {{ combo }} 题，加分！</div>
                    <div v-if="selectedOption !== question.correctIndex" class="fb-detail">正确答案：{{ question.options[question.correctIndex] }}</div>
                  </div>
                </div>
                <button class="fb-next" @click="nextStep">
                  {{ currentQuestion < level.questions.length - 1 ? '下一题' : '查看结果' }}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ LEVEL CLEAR ═══ -->
    <div v-else-if="phase === 'level-clear'" class="phase-result">
      <div class="result-card">
        <div class="rc-icon">{{ level.icon }}</div>
        <h2 class="rc-title">{{ level.name }} 通关！</h2>
        <div class="rc-stars">
          <span v-for="s in 3" :key="s" :class="['rc-star', { filled: s <= (levelResults[levelResults.length - 1]?.stars || 0) }]" :style="{ animationDelay: `${s * 0.15}s` }">★</span>
        </div>
        <div class="rc-stats">
          <div class="rcs"><span class="rcs-val">{{ levelResults[levelResults.length - 1]?.correct }}/{{ levelResults[levelResults.length - 1]?.total }}</span><span class="rcs-label">正确</span></div>
          <div class="rcs"><span class="rcs-val">{{ score }}</span><span class="rcs-label">得分</span></div>
          <div class="rcs"><span class="rcs-val">{{ maxCombo }}x</span><span class="rcs-label">最大连击</span></div>
        </div>
        <button class="rc-continue" @click="continueToNextLevel">
          下一关：{{ levels[currentLevel + 1]?.name }}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>

    <!-- ═══ GAME OVER ═══ -->
    <div v-else-if="phase === 'gameover'" class="phase-result">
      <div class="result-card result-card-final">
        <div class="rc-icon">{{ hearts > 0 ? '🏆' : '💪' }}</div>
        <h2 class="rc-title">{{ hearts > 0 ? '闯关完成！' : '挑战结束' }}</h2>
        <p class="rc-sub">{{ hearts > 0 ? '恭喜你完成了所有关卡的挑战' : '没关系，复习后再来挑战一次吧' }}</p>

        <div class="final-summary">
          <div class="fs-item"><span class="fs-val">{{ score }}</span><span class="fs-label">总得分</span></div>
          <div class="fs-divider" />
          <div class="fs-item"><span class="fs-val">{{ accuracy }}%</span><span class="fs-label">正确率</span></div>
          <div class="fs-divider" />
          <div class="fs-item"><span class="fs-val">{{ maxCombo }}x</span><span class="fs-label">最大连击</span></div>
        </div>

        <div class="final-levels">
          <div v-for="result in levelResults" :key="result.levelIdx" class="fl-row">
            <span class="fl-icon">{{ levels[result.levelIdx].icon }}</span>
            <span class="fl-name">{{ levels[result.levelIdx].name }}</span>
            <span class="fl-score">{{ result.correct }}/{{ result.total }}</span>
            <span class="fl-stars">
              <span v-for="s in 3" :key="s" :class="['fl-star', { filled: s <= result.stars }]">★</span>
            </span>
          </div>
        </div>

        <div class="final-actions">
          <button class="fa-restart" @click="restartGame">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.56" /></svg>
            重新挑战
          </button>
          <button class="fa-back" @click="backToLesson">
            返回继续学习
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.game-page {
  min-height: 100vh;
  font-family: 'Sora', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #f4f6fb;
}

/* ── Top bar ─────────────────────────────────────────────── */
.game-topbar {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; height: 60px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.topbar-left { display: flex; align-items: center; gap: 14px; }

.back-btn {
  all: unset; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 10px;
  color: #64748b; font-size: 13px; font-weight: 600;
  transition: all 0.15s;
}
.back-btn:hover { background: #f1f5f9; color: #1e293b; }

.topbar-divider { width: 1px; height: 24px; background: #e5e7eb; }

.topbar-info { display: flex; flex-direction: column; gap: 1px; }
.topbar-course { font-size: 14px; font-weight: 700; color: #1e3a5f; }
.topbar-section { font-size: 11px; color: #94a3b8; }

.topbar-right { display: flex; align-items: center; gap: 14px; }
.stat-hearts { display: flex; gap: 4px; }
.heart { transition: all 0.3s; display: flex; }
.heart.lost { opacity: 0.25; transform: scale(0.85); }
.stat-score {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 999px;
  background: #fffbeb; border: 1px solid #fef3c7;
  font-size: 14px; font-weight: 700; color: #b45309;
}
.stat-combo {
  padding: 4px 10px; border-radius: 999px;
  background: linear-gradient(135deg, #eff6ff, #e0f2fe);
  border: 1px solid #bfdbfe;
  color: #1d4ed8; font-size: 12px; font-weight: 700;
}
.combo-pop-enter-active { animation: combo-in 0.35s ease; }
.combo-pop-leave-active { animation: combo-in 0.2s ease reverse; }
@keyframes combo-in { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

/* ── MAP ─────────────────────────────────────────────────── */
.phase-map {
  max-width: 800px; margin: 0 auto;
  padding: 40px 24px 80px;
}

.map-hero {
  display: flex; align-items: center; gap: 18px;
  margin-bottom: 40px;
  padding: 28px 32px; border-radius: 20px;
  background: linear-gradient(135deg, #0f2550 0%, #1a4480 50%, #0e6fa8 100%);
  color: #fff;
}
.map-hero-icon {
  width: 52px; height: 52px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.map-title { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
.map-sub { font-size: 13px; color: #93c5fd; line-height: 1.5; }

.level-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.level-card {
  all: unset; cursor: pointer;
  position: relative;
  padding: 24px; border-radius: 16px;
  background: #fff;
  border: 1.5px solid #e5ecf7;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  transition: all 0.22s ease;
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 6px;
}
.level-card:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.1);
  border-color: #bfdbfe;
}
.level-card.locked { opacity: 0.45; cursor: not-allowed; }
.level-card.cleared { border-color: #bbf7d0; background: #f0fdf4; }
.level-card.current { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08); }

.lc-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.lc-icon { font-size: 32px; }
.lc-lock { color: #94a3b8; }
.lc-check {
  width: 22px; height: 22px; border-radius: 50%;
  background: #10b981; color: #fff;
  font-size: 12px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.lc-name { font-size: 16px; font-weight: 700; color: #0f172a; }
.lc-desc { font-size: 12px; color: #94a3b8; }
.lc-stars { display: flex; gap: 2px; margin-top: 4px; }
.lc-star { font-size: 18px; color: #e2e8f0; }
.lc-star.filled { color: #f59e0b; }
.lc-cta {
  margin-top: 8px; padding: 6px 16px; border-radius: 8px;
  background: #eff6ff; color: #2563eb;
  font-size: 12px; font-weight: 700;
}
.lc-badge {
  position: absolute; top: 12px; right: 12px;
  padding: 2px 8px; border-radius: 6px;
  background: #f8fafc; color: #94a3b8;
  font-size: 11px; font-weight: 600;
}

/* ── PLAYING ─────────────────────────────────────────────── */
.phase-play {
  min-height: calc(100vh - 60px);
  display: flex; justify-content: center;
  padding: 24px 24px 80px;
}

.play-container { width: 100%; max-width: 640px; }

.progress-bar-wrap {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 20px;
}
.pb-level {
  font-size: 13px; font-weight: 700; color: #1e3a5f;
  white-space: nowrap;
}
.pb-track { display: flex; gap: 6px; flex: 1; }
.pb-segment {
  flex: 1; height: 32px; border-radius: 8px;
  background: #fff; border: 1.5px solid #e5ecf7;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.3s;
}
.pb-num { font-size: 12px; font-weight: 700; color: #94a3b8; }
.pb-segment.current { border-color: #3b82f6; background: #eff6ff; }
.pb-segment.current .pb-num { color: #2563eb; }
.pb-segment.correct { border-color: #86efac; background: #f0fdf4; }
.pb-segment.correct .pb-num { color: #16a34a; }
.pb-segment.wrong { border-color: #fca5a5; background: #fef2f2; }
.pb-segment.wrong .pb-num { color: #dc2626; }

/* Timer */
.timer-bar {
  position: relative; height: 6px; border-radius: 999px;
  background: #f1f5f9; margin-bottom: 16px; overflow: hidden;
}
.timer-fill {
  height: 100%; border-radius: 999px;
  transition: width 1s linear, background 0.3s;
}
.timer-label {
  position: absolute; right: 0; top: -22px;
  font-size: 13px; font-weight: 700;
}

/* Question card */
.q-card {
  padding: 32px; border-radius: 20px;
  background: #fff;
  border: 1px solid #e5ecf7;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
}

.q-kp {
  display: inline-block;
  padding: 4px 12px; border-radius: 999px;
  background: #eff6ff; color: #2563eb;
  font-size: 12px; font-weight: 600; margin-bottom: 16px;
}

.q-text {
  font-size: 17px; font-weight: 700; color: #0f172a;
  line-height: 1.65; margin-bottom: 24px;
}

.options-list { display: flex; flex-direction: column; gap: 10px; }

.opt-btn {
  all: unset; cursor: pointer;
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px; border-radius: 14px;
  background: #f8fafc; border: 1.5px solid #e5ecf7;
  font-size: 14px; color: #334155;
  transition: all 0.18s;
}
.opt-btn:hover:not(:disabled) {
  background: #eff6ff; border-color: #93c5fd;
  transform: translateX(3px);
}
.opt-btn.selected { border-color: #3b82f6; background: #eff6ff; }
.opt-btn.correct { border-color: #10b981; background: #f0fdf4; color: #065f46; }
.opt-btn.wrong { border-color: #ef4444; background: #fef2f2; color: #991b1b; }
.opt-btn.dimmed { opacity: 0.4; }

.opt-key {
  width: 30px; height: 30px; border-radius: 8px;
  background: #e5ecf7; color: #475569;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; flex-shrink: 0;
}
.opt-btn.correct .opt-key { background: #d1fae5; color: #065f46; }
.opt-btn.wrong .opt-key { background: #fee2e2; color: #991b1b; }
.opt-btn:hover:not(:disabled) .opt-key { background: #dbeafe; color: #1e40af; }
.opt-label { flex: 1; line-height: 1.5; }
.opt-result-icon { flex-shrink: 0; }
.opt-result-icon.correct { color: #10b981; }
.opt-result-icon.wrong { color: #ef4444; }

/* Hint */
.hint-toggle {
  all: unset; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 20px; padding: 7px 14px; border-radius: 8px;
  background: #fffbeb; border: 1px solid #fef3c7;
  color: #b45309; font-size: 12px; font-weight: 600;
  transition: background 0.15s;
}
.hint-toggle:hover { background: #fef3c7; }
.hint-box {
  margin-top: 14px; padding: 12px 16px; border-radius: 10px;
  background: #fffbeb; border: 1px solid #fef3c7;
  color: #92400e; font-size: 13px; line-height: 1.6;
}

/* Feedback */
.feedback-bar { margin-top: 16px; }
.fb-content {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-radius: 14px;
  gap: 16px;
}
.fb-correct { background: #f0fdf4; border: 1px solid #bbf7d0; }
.fb-wrong { background: #fef2f2; border: 1px solid #fecaca; }
.fb-left { display: flex; align-items: center; gap: 12px; }
.fb-emoji { font-size: 28px; flex-shrink: 0; }
.fb-title { font-size: 14px; font-weight: 700; color: #0f172a; }
.fb-detail { font-size: 12px; color: #64748b; margin-top: 2px; }

.fb-next {
  all: unset; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  padding: 10px 20px; border-radius: 10px;
  background: #2563eb; color: #fff;
  font-size: 14px; font-weight: 700;
  white-space: nowrap;
  transition: all 0.18s;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}
.fb-next:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3); }

/* ── RESULT SCREENS ──────────────────────────────────────── */
.phase-result {
  min-height: calc(100vh - 60px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

.result-card {
  text-align: center; width: 100%; max-width: 440px;
  padding: 44px 36px; border-radius: 24px;
  background: #fff;
  border: 1px solid #e5ecf7;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.06);
}

.rc-icon { font-size: 52px; margin-bottom: 12px; }
.rc-title { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
.rc-sub { font-size: 13px; color: #64748b; margin-bottom: 28px; }
.rc-stars { display: flex; justify-content: center; gap: 8px; margin-bottom: 28px; }
.rc-star {
  font-size: 36px; color: #e2e8f0;
  animation: star-bounce 0.4s ease both;
}
.rc-star.filled { color: #f59e0b; text-shadow: 0 2px 8px rgba(245, 158, 11, 0.3); }
@keyframes star-bounce { 0% { transform: scale(0) rotate(-20deg); opacity: 0; } 60% { transform: scale(1.2) rotate(5deg); } 100% { transform: scale(1) rotate(0); opacity: 1; } }

.rc-stats {
  display: flex; justify-content: center; gap: 24px;
  margin-bottom: 28px;
  padding: 16px; border-radius: 12px;
  background: #f8fafc;
}
.rcs { display: flex; flex-direction: column; gap: 4px; }
.rcs-val { font-size: 22px; font-weight: 800; color: #2563eb; }
.rcs-label { font-size: 11px; color: #94a3b8; font-weight: 600; }

.rc-continue {
  all: unset; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; border-radius: 12px;
  background: #2563eb; color: #fff;
  font-size: 15px; font-weight: 700;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  transition: all 0.18s;
}
.rc-continue:hover { background: #1d4ed8; transform: translateY(-1px); }

/* Final game over card */
.final-summary {
  display: flex; justify-content: center; align-items: center; gap: 20px;
  margin-bottom: 24px; padding: 20px; border-radius: 14px;
  background: #f8fafc; border: 1px solid #f1f5f9;
}
.fs-item { display: flex; flex-direction: column; gap: 4px; }
.fs-val { font-size: 26px; font-weight: 800; color: #2563eb; }
.fs-label { font-size: 11px; color: #94a3b8; font-weight: 600; }
.fs-divider { width: 1px; height: 36px; background: #e5e7eb; }

.final-levels {
  display: flex; flex-direction: column; gap: 6px;
  margin-bottom: 24px; text-align: left;
}
.fl-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px;
  background: #f8fafc;
}
.fl-icon { font-size: 18px; }
.fl-name { flex: 1; font-size: 13px; font-weight: 600; color: #334155; }
.fl-score { font-size: 13px; font-weight: 700; color: #64748b; }
.fl-stars { display: flex; gap: 2px; font-size: 14px; }
.fl-star { color: #e2e8f0; }
.fl-star.filled { color: #f59e0b; }

.final-actions { display: flex; gap: 10px; }
.fa-restart, .fa-back {
  all: unset; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  flex: 1; padding: 12px; border-radius: 12px;
  font-size: 13.5px; font-weight: 700;
  transition: all 0.18s;
}
.fa-restart {
  background: #f1f5f9; color: #475569;
  border: 1px solid #e5ecf7;
}
.fa-restart:hover { background: #e5ecf7; color: #1e293b; }
.fa-back {
  background: #2563eb; color: #fff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}
.fa-back:hover { background: #1d4ed8; transform: translateY(-1px); }

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 640px) {
  .game-topbar { padding: 0 16px; }
  .topbar-info { display: none; }
  .topbar-divider { display: none; }
  .level-grid { grid-template-columns: 1fr; }
  .q-card { padding: 24px 20px; }
  .q-text { font-size: 15px; }
  .opt-btn { padding: 12px 14px; font-size: 13px; }
  .fb-content { flex-direction: column; align-items: stretch; }
  .fb-next { justify-content: center; }
  .final-actions { flex-direction: column; }
}
</style>
