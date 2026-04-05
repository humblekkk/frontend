<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { buildMockGameQuiz, parseMockGameContext } from '@/utils/mockGameQuiz'

const GAME_WIDTH = 960
const GAME_HEIGHT = 640
const GAME_RATIO = GAME_WIDTH / GAME_HEIGHT

const route = useRoute()
const router = useRouter()

const frameVersion = ref(0)
const gameStageRef = ref(null)
const gameFrameRef = ref(null)
const stageViewport = ref({ width: 0, height: 0 })
const quizInjected = ref(false)

const quizContext = computed(() => parseMockGameContext(route.query))
const quizPayload = computed(() => buildMockGameQuiz(quizContext.value))

// ── 修复：不再通过 URL 传 quizData，改用 postMessage ──────────
// iframe src 只携带 level 参数，避免中文 URL 编码导致数据截断
const iframeSrc = computed(() => {
  const params = new URLSearchParams({ level: '1' })
  return `/scgame/index.html?${params.toString()}?v=${frameVersion.value}`
})

// iframe 加载完成后通过 postMessage 注入题库数据
const injectQuizData = () => {
  const iframe = gameFrameRef.value
  if (!iframe || !iframe.contentWindow) return
  try {
    iframe.contentWindow.postMessage(
      { type: 'SCGAME_INJECT_QUIZ', payload: quizPayload.value },
      '*'
    )
    quizInjected.value = true
  } catch (e) {
    console.warn('[GamePlayer] postMessage failed:', e)
  }
}

const onFrameLoad = () => {
  // 稍作延迟，等 Cocos 引擎初始化完成再注入
  setTimeout(injectQuizData, 600)
}

const updateStageViewport = () => {
  const element = gameStageRef.value
  if (!element) return
  stageViewport.value = {
    width: element.clientWidth,
    height: element.clientHeight,
  }
}

const frameShellStyle = computed(() => {
  const { width, height } = stageViewport.value
  if (!width || !height) return {}

  let nextWidth = width
  let nextHeight = nextWidth / GAME_RATIO

  if (nextHeight > height) {
    nextHeight = height
    nextWidth = nextHeight * GAME_RATIO
  }

  return {
    width: `${Math.floor(nextWidth)}px`,
    height: `${Math.floor(nextHeight)}px`,
  }
})

let resizeObserver = null

const refreshGame = () => {
  quizInjected.value = false
  frameVersion.value += 1
}

const backToLesson = () => {
  router.push({ path: '/lesson/player', query: route.query })
}

onMounted(() => {
  updateStageViewport()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(updateStageViewport)
    if (gameStageRef.value) resizeObserver.observe(gameStageRef.value)
  }
  window.addEventListener('resize', updateStageViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateStageViewport)
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
})
</script>

<template>
  <div class="game-shell">
    <div class="game-panel">

      <!-- ── Toolbar ──────────────────────────────────────────── -->
      <header class="game-toolbar">
        <button class="toolbar-btn back-btn" @click="backToLesson">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          返回课堂
        </button>

        <div class="toolbar-main">
          <div class="title-row">
            <div class="title-icon">⚡</div>
            <div class="title-text">
              <p class="eyebrow">PRACTICE MODE</p>
              <h1 class="toolbar-title">练习闯关</h1>
            </div>
            <span class="mode-tag">Mock Quiz</span>
          </div>

          <div class="meta-strip">
            <div class="meta-pill">
              <span class="meta-label">课程</span>
              <strong>{{ quizContext.courseName }}</strong>
            </div>
            <div class="meta-pill">
              <span class="meta-label">课时</span>
              <strong>{{ quizContext.lessonTitle }}</strong>
            </div>
            <div class="meta-pill">
              <span class="meta-label">知识点</span>
              <strong>{{ quizContext.sectionTitle }}</strong>
            </div>
            <div class="meta-pill">
              <span class="meta-label">页码</span>
              <strong>第 {{ quizContext.currentPage }} 页</strong>
            </div>
          </div>
        </div>

        <button class="toolbar-btn refresh-btn" @click="refreshGame">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.56" />
          </svg>
          重新开始
        </button>
      </header>

      <!-- ── Game stage ───────────────────────────────────────── -->
      <section ref="gameStageRef" class="game-stage">
        <!-- 注入状态指示 -->
        <div v-if="!quizInjected" class="inject-overlay">
          <div class="inject-spinner" />
          <span>正在加载题库…</span>
        </div>

        <div class="game-frame-shell" :style="frameShellStyle">
          <iframe ref="gameFrameRef" :key="frameVersion" class="game-frame" :src="iframeSrc" title="练习闯关"
            allow="fullscreen" @load="onFrameLoad" />
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ── Shell ────────────────────────────────────────────────── */
.game-shell {
  height: 100dvh;
  min-height: 100vh;
  overflow: hidden;
  font-family: 'Sora', sans-serif;
  background:
    radial-gradient(ellipse at 0% 0%, rgba(56, 189, 248, 0.18) 0%, transparent 40%),
    radial-gradient(ellipse at 100% 0%, rgba(99, 102, 241, 0.14) 0%, transparent 38%),
    radial-gradient(ellipse at 50% 100%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
    linear-gradient(160deg, #e8f4ff 0%, #f3f8ff 50%, #eef6ff 100%);
  padding: 10px;
}

.game-panel {
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
}

/* ── Toolbar ──────────────────────────────────────────────── */
.game-toolbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(186, 220, 255, 0.7);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 12px 32px rgba(15, 23, 42, 0.07),
    0 2px 8px rgba(37, 99, 235, 0.06);
  backdrop-filter: blur(12px);
}

.toolbar-main {
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.title-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
}

.title-text {
  min-width: 0;
}

.eyebrow {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #2563eb;
  opacity: 0.75;
  margin-bottom: 1px;
}

.toolbar-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.mode-tag {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(8, 145, 178, 0.1));
  color: #1d4ed8;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  border: 1px solid rgba(37, 99, 235, 0.15);
}

/* Meta pills */
.meta-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.meta-strip::-webkit-scrollbar {
  display: none;
}

.meta-pill {
  flex: 0 0 auto;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f0f7ff, #e8f3ff);
  border: 1px solid rgba(186, 220, 255, 0.6);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.meta-label {
  font-family: 'Space Mono', monospace;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
}

.meta-pill strong {
  font-size: 12.5px;
  font-weight: 700;
  color: #1e3a5f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
}

/* Toolbar buttons */
.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  white-space: nowrap;
}

.back-btn {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.back-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
  transform: translateX(-2px);
}

.refresh-btn {
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: #fff;
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
}

.refresh-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(37, 99, 235, 0.4);
}

/* ── Game stage ───────────────────────────────────────────── */
.game-stage {
  position: relative;
  min-height: 0;
  display: grid;
  place-items: center;
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(ellipse at center, rgba(15, 23, 42, 0.12), rgba(15, 23, 42, 0.22));
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.06);
}

/* 加载遮罩 */
.inject-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(10, 18, 36, 0.72);
  backdrop-filter: blur(4px);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  border-radius: 22px;
  pointer-events: none;
}

.inject-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: #60a5fa;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.game-frame-shell {
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 960 / 640;
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 24px 48px rgba(15, 23, 42, 0.32);
}

.game-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 900px) {
  .game-toolbar {
    padding: 12px 14px;
  }

  .toolbar-title {
    font-size: 20px;
  }

  .meta-pill strong {
    max-width: 110px;
  }
}

@media (max-width: 720px) {
  .game-toolbar {
    grid-template-columns: 1fr auto;
    align-items: start;
  }

  .toolbar-main {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .mode-tag {
    display: none;
  }

  .title-icon {
    width: 34px;
    height: 34px;
    font-size: 17px;
  }
}

@media (max-width: 520px) {
  .game-shell {
    padding: 6px;
  }

  .game-panel {
    gap: 6px;
  }

  .game-toolbar {
    border-radius: 16px;
    padding: 10px 11px;
  }

  .toolbar-btn {
    padding: 8px 12px;
    font-size: 12px;
  }

  .toolbar-title {
    font-size: 18px;
  }

  .meta-pill {
    padding: 7px 10px;
  }

  .meta-pill strong {
    font-size: 11.5px;
    max-width: 90px;
  }

  .game-stage {
    border-radius: 16px;
  }

  .inject-overlay {
    border-radius: 16px;
  }

  .game-frame-shell {
    border-radius: 12px;
  }
}
</style>
