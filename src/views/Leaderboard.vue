<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/userStore'

const router = useRouter()
const userStore = useUserStore()

const goHome = () => router.push('/home')

const boardTabs = [
  { key: 'overall', label: '总榜' },
  { key: 'weekly', label: '本周榜' },
  { key: 'interactive', label: '互动榜' },
  { key: 'growth', label: '课程进步榜' },
]

const courseOptions = [
  { value: 'all', label: '全部课程' },
  { value: '线性代数', label: '线性代数' },
  { value: '人工智能导论', label: '人工智能导论' },
  { value: '机器学习基础', label: '机器学习基础' },
  { value: 'Python 程序设计', label: 'Python 程序设计' },
]

const rankingEntries = [
  {
    id: 'u-1',
    name: '林知夏',
    courseName: '线性代数',
    score: 98,
    progress: 96,
    interactions: 18,
    qaAccuracy: 97,
    weeklyScore: 88,   // 新增：本周专项分
    rankDelta: 2,      // 仅用于展示，不再参与分数计算
    badge: '进步最快',
    avatar: '林',
  },
  {
    id: 'u-2',
    name: '陈屿',
    courseName: '人工智能导论',
    score: 94,
    progress: 91,
    interactions: 15,
    qaAccuracy: 95,
    weeklyScore: 82,
    rankDelta: 1,
    badge: '稳定输出',
    avatar: '陈',
  },
  {
    id: 'u-3',
    name: '宋嘉宁',
    courseName: '机器学习基础',
    score: 92,
    progress: 89,
    interactions: 17,
    qaAccuracy: 92,
    weeklyScore: 85,
    rankDelta: -1,
    badge: '互动积极',
    avatar: '宋',
  },
  {
    id: 'u-4',
    name: '周予安',
    courseName: 'Python 程序设计',
    score: 89,
    progress: 87,
    interactions: 12,
    qaAccuracy: 90,
    weeklyScore: 79,
    rankDelta: 3,
    badge: '答疑高效',
    avatar: '周',
  },
  {
    id: 'u-5',
    name: '沈星遥',
    courseName: '线性代数',
    score: 86,
    progress: 83,
    interactions: 11,
    qaAccuracy: 88,
    weeklyScore: 76,
    rankDelta: 0,
    badge: '稳步提升',
    avatar: '沈',
  },
  {
    id: 'u-6',
    name: '顾言',
    courseName: '人工智能导论',
    score: 84,
    progress: 82,
    interactions: 10,
    qaAccuracy: 86,
    weeklyScore: 74,
    rankDelta: 1,
    badge: '课堂专注',
    avatar: '顾',
  },
  {
    id: 'u-7',
    name: '何清越',
    courseName: '机器学习基础',
    score: 82,
    progress: 79,
    interactions: 9,
    qaAccuracy: 85,
    weeklyScore: 71,
    rankDelta: -2,
    badge: '潜力选手',
    avatar: '何',
  },
  {
    id: 'u-8',
    name: '许澈',
    courseName: '线性代数',
    score: 80,
    progress: 77,
    interactions: 8,
    qaAccuracy: 84,
    weeklyScore: 69,
    rankDelta: 2,
    badge: '状态回升',
    avatar: '许',
  },
  {
    id: 'u-9',
    name: '程知微',
    courseName: 'Python 程序设计',
    score: 78,
    progress: 76,
    interactions: 7,
    qaAccuracy: 82,
    weeklyScore: 67,
    rankDelta: 0,
    badge: '持续打卡',
    avatar: '程',
  },
  {
    id: 'u-10',
    name: '姜望舒',
    courseName: '人工智能导论',
    score: 76,
    progress: 73,
    interactions: 6,
    qaAccuracy: 80,
    weeklyScore: 64,
    rankDelta: -1,
    badge: '保持节奏',
    avatar: '姜',
  },
]

// FIX 1: rankDelta 不再参与分数计算，各榜单使用独立的字段/公式
const getBoardScore = (entry, boardKey) => {
  if (boardKey === 'weekly') return entry.weeklyScore
  if (boardKey === 'interactive') return Math.round(entry.interactions * 5 + entry.qaAccuracy * 0.3)
  if (boardKey === 'growth') return Math.round(entry.progress * 0.7 + entry.qaAccuracy * 0.3)
  return entry.score // overall
}

const currentUserName = computed(() => userStore.userInfo.name || userStore.userInfo.userId || '我')
const isTeacher = computed(() => userStore.isTeacher)
const activeBoard = ref('overall')
const activeCourse = ref('all')

const boardIntroMap = {
  overall: {
    teacherTitle: '班级活跃总榜',
    teacherDesc: '综合学习活跃度、互动表现与任务完成度生成班级排行榜。',
    studentTitle: '课堂综合总榜',
    studentDesc: '综合学习进度、课堂互动和答疑表现形成你的课堂位置。',
  },
  weekly: {
    teacherTitle: '本周课堂热度榜',
    teacherDesc: '聚焦最近一周课堂表现，便于快速发现状态上升的学生。',
    studentTitle: '本周冲榜动态',
    studentDesc: '查看最近一周谁在持续上分，也看看自己离前一名还有多远。',
  },
  interactive: {
    teacherTitle: '互动表现榜',
    teacherDesc: '按提问、答疑参与和课堂响应次数统计互动活跃度。',
    studentTitle: '互动活跃榜',
    studentDesc: '更适合展示课堂参与度和表达积极性。',
  },
  growth: {
    teacherTitle: '课程进步榜',
    teacherDesc: '关注学习进步曲线，帮助你快速识别提升最快的学生。',
    studentTitle: '课程进步榜',
    studentDesc: '更强调成长幅度，而不是单纯看当前绝对分数。',
  },
}

const rankedEntries = computed(() => {
  const filtered = rankingEntries.filter(
    (entry) => activeCourse.value === 'all' || entry.courseName === activeCourse.value,
  )
  return filtered
    .map((entry) => ({
      ...entry,
      boardScore: getBoardScore(entry, activeBoard.value),
    }))
    .sort((a, b) => b.boardScore - a.boardScore)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }))
})

// FIX 2: 讲台区顺序 — 视觉上"2nd 左 | 1st 中 | 3rd 右"，用 CSS order 控制，数据顺序保持 1/2/3
// 让模板按 1/2/3 顺序拿数据，CSS 里给 rank-1 设 order:2，rank-2 设 order:1，rank-3 设 order:3
const podiumEntries = computed(() => {
  const r = rankedEntries.value
  return [r[0], r[1], r[2]].filter(Boolean)
})

const heroContent = computed(() => {
  const boardIntro = boardIntroMap[activeBoard.value]
  if (isTeacher.value) {
    return {
      eyebrow: '✦ CLASS PERFORMANCE RANKING',
      title: boardIntro.teacherTitle,
      subtitle: boardIntro.teacherDesc,
      metrics: [
        { value: '50', label: '在榜学生' },
        { value: '12', label: '本周互动峰值' },
        { value: '91%', label: '平均完成度' },
      ],
    }
  }

  return {
    eyebrow: '✦ LEARNING LEADERBOARD',
    title: boardIntro.studentTitle,
    subtitle: boardIntro.studentDesc,
    metrics: [
      { value: 'TOP 10', label: '当前榜单范围' },
      { value: '8', label: '与上一名差距' },
      { value: '3', label: '最近上升名次' },
    ],
  }
})

// FIX 3: 先按 name 匹配，fallback 用固定占位而非随机取 ranking[5]
const currentStudentEntry = computed(() => {
  const ranking = rankedEntries.value
  const matched = ranking.find((entry) => entry.name === currentUserName.value)
  if (matched) return matched

  // 未命中时给出一个稳定的 fallback，不依赖排序结果的索引
  return {
    id: 'current-user',
    name: currentUserName.value,
    avatar: String(currentUserName.value).slice(0, 1) || '我',
    courseName: '—',
    rank: ranking.length + 1,
    boardScore: 0,
    score: 0,
    progress: 0,
    interactions: 0,
    qaAccuracy: 0,
    rankDelta: 0,
    badge: '—',
  }
})

const previousStudentEntry = computed(() => {
  const myRank = currentStudentEntry.value.rank
  return rankedEntries.value.find((entry) => entry.rank === myRank - 1) || null
})

const studentGap = computed(() => {
  if (!previousStudentEntry.value) return 0
  return Math.max(0, Math.round((previousStudentEntry.value.boardScore - currentStudentEntry.value.boardScore) * 10) / 10)
})

const teacherInsightCards = computed(() => ([
  {
    title: '进步之星',
    value: '林知夏',
    desc: '本周上升 2 名，线性代数完成度达到 96%',
  },
  {
    title: '互动最强',
    value: '宋嘉宁',
    desc: '课堂互动 17 次，追问与答疑参与度最高',
  },
  {
    title: '值得关注',
    value: '姜望舒',
    desc: '完成度与互动频次连续两周略有下降',
  },
]))

const formatDelta = (value) => {
  if (value > 0) return `↑ ${value}`
  if (value < 0) return `↓ ${Math.abs(value)}`
  return '—'
}

const deltaClass = (value) => {
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}

const isCurrentStudent = (entry) => !isTeacher.value && entry.name === currentStudentEntry.value.name
</script>

<template>
  <div class="leaderboard-page">
    <header class="top-nav">
      <div class="nav-left">
        <button class="back-btn" @click="goHome">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div class="brand-block">
          <div class="brand-eyebrow">知微智课</div>
          <div class="brand-title">排行榜</div>
        </div>
      </div>
      <div class="nav-right">
        <button v-for="tab in boardTabs" :key="tab.key" type="button" class="nav-chip"
          :class="{ active: activeBoard === tab.key }" @click="activeBoard = tab.key">
          {{ tab.label }}
        </button>
      </div>
    </header>

    <section class="hero-panel">
      <div class="hero-copy">
        <p class="hero-eyebrow">{{ heroContent.eyebrow }}</p>
        <h1 class="hero-title">{{ heroContent.title }}</h1>
        <p class="hero-subtitle">{{ heroContent.subtitle }}</p>

        <div class="hero-metrics">
          <div v-for="metric in heroContent.metrics" :key="metric.label" class="hero-metric">
            <span class="hero-metric-value">{{ metric.value }}</span>
            <span class="hero-metric-label">{{ metric.label }}</span>
          </div>
        </div>
      </div>

      <div class="hero-visual">
        <div class="ring ring-lg" />
        <div class="ring ring-md" />
        <div class="ring ring-sm" />
        <div class="crown-core">
          <span>#1</span>
        </div>
      </div>
    </section>

    <section class="toolbar">
      <div class="toolbar-left">
        <button v-for="tab in boardTabs" :key="tab.key" type="button" class="filter-pill"
          :class="{ active: activeBoard === tab.key }" @click="activeBoard = tab.key">
          {{ tab.label }}
        </button>
      </div>
      <div class="toolbar-right">
        <label class="select-label" for="course-filter">课程范围</label>
        <select id="course-filter" v-model="activeCourse" class="course-select">
          <option v-for="option in courseOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </section>

    <section class="podium-section">
      <div class="section-head">
        <div>
          <p class="section-eyebrow">TOP 3</p>
          <h2 class="section-title">领跑席位</h2>
        </div>
        <div class="section-note">榜单分值会随筛选条件动态更新</div>
      </div>

      <!-- FIX 2: 数据按 rank 1/2/3 顺序传入，CSS order 负责视觉排布（2nd左/1st中/3rd右） -->
      <div class="podium-grid">
        <article v-for="entry in podiumEntries" :key="entry.id" class="podium-card" :class="`rank-${entry.rank}`">
          <div class="podium-rank">No.{{ entry.rank }}</div>
          <div class="podium-avatar">{{ entry.avatar }}</div>
          <h3 class="podium-name">{{ entry.name }}</h3>
          <div class="podium-score">{{ entry.boardScore }}</div>
          <div class="podium-badge">{{ entry.badge }}</div>
          <div class="podium-course">{{ entry.courseName }}</div>
        </article>
      </div>
    </section>

    <section class="main-grid">
      <div class="rank-panel">
        <div class="section-head compact">
          <div>
            <p class="section-eyebrow">RANKING LIST</p>
            <h2 class="section-title">完整榜单</h2>
          </div>
          <div class="section-note">{{ activeCourse === 'all' ? '全部课程' : activeCourse }}</div>
        </div>

        <div class="rank-list">
          <article v-for="entry in rankedEntries" :key="entry.id" class="rank-row"
            :class="{ highlight: isCurrentStudent(entry) }">
            <div class="rank-index">{{ entry.rank }}</div>
            <div class="rank-user">
              <div class="rank-avatar">{{ entry.avatar }}</div>
              <div class="rank-user-meta">
                <div class="rank-name-line">
                  <span class="rank-name">{{ entry.name }}</span>
                  <span class="rank-badge">{{ entry.badge }}</span>
                </div>
                <div class="rank-sub">{{ entry.courseName }}</div>
              </div>
            </div>
            <div class="rank-metrics">
              <span>完成度 {{ entry.progress }}%</span>
              <span>互动 {{ entry.interactions }}</span>
              <span>答疑 {{ entry.qaAccuracy }}%</span>
            </div>
            <div class="rank-score">
              <span class="score-value">{{ entry.boardScore }}</span>
              <span class="score-delta" :class="deltaClass(entry.rankDelta)">{{ formatDelta(entry.rankDelta) }}</span>
            </div>
          </article>
        </div>
      </div>

      <aside class="side-panel">
        <template v-if="isTeacher">
          <div class="spotlight-card">
            <p class="section-eyebrow">TEACHER INSIGHT</p>
            <h3 class="spotlight-title">课堂观察</h3>
            <div class="insight-list">
              <article v-for="item in teacherInsightCards" :key="item.title" class="insight-item">
                <div class="insight-title">{{ item.title }}</div>
                <div class="insight-value">{{ item.value }}</div>
                <div class="insight-desc">{{ item.desc }}</div>
              </article>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="spotlight-card">
            <p class="section-eyebrow">MY RANK</p>
            <h3 class="spotlight-title">我的位置</h3>
            <div class="my-rank-card">
              <div class="my-rank-top">
                <div>
                  <div class="my-rank-value">No.{{ currentStudentEntry.rank }}</div>
                  <div class="my-rank-course">{{ currentStudentEntry.courseName }}</div>
                </div>
                <div class="my-rank-avatar">{{ currentStudentEntry.avatar }}</div>
              </div>
              <p class="my-rank-desc">
                <template v-if="studentGap > 0">
                  距离上一名还差 <strong>{{ studentGap }}</strong> 分，继续保持互动和任务完成度就能继续上升。
                </template>
                <template v-else>
                  你已经是本榜第一名，保持状态继续领跑！
                </template>
              </p>
              <div class="my-rank-stats">
                <span>完成度 {{ currentStudentEntry.progress }}%</span>
                <span>互动 {{ currentStudentEntry.interactions }}</span>
                <span>答疑 {{ currentStudentEntry.qaAccuracy }}%</span>
              </div>
            </div>
          </div>
        </template>
      </aside>
    </section>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Noto+Serif+SC:wght@600;700&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
}

.leaderboard-page {
  min-height: 100vh;
  padding: 28px 32px 48px;
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.18), transparent 28%),
    radial-gradient(circle at right 20%, rgba(14, 165, 233, 0.12), transparent 26%),
    linear-gradient(180deg, #f4f7fc 0%, #eef3fb 100%);
  font-family: 'Sora', sans-serif;
  color: #0f172a;
}

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 0 auto 24px;
  padding: 14px 18px;
  max-width: 1400px;
  border: 1px solid rgba(191, 219, 254, 0.85);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(14px);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.nav-left,
.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  all: unset;
  cursor: pointer;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4b6483;
  background: #eef4fc;
  transition: all 0.18s ease;
}

.back-btn:hover {
  background: #dce9f9;
  color: #163a63;
}

.brand-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #7f95af;
  text-transform: uppercase;
}

.brand-title {
  font-size: 18px;
  font-weight: 800;
  color: #173354;
}

.nav-chip {
  all: unset;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #6b7f99;
  background: #edf3fb;
  transition: all 0.18s ease;
}

.nav-chip.active,
.nav-chip:hover {
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.22);
}

.hero-panel {
  max-width: 1400px;
  margin: 0 auto;
  padding: 42px 48px;
  border-radius: 28px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 28px;
  background:
    linear-gradient(135deg, rgba(15, 37, 80, 0.98) 0%, rgba(23, 64, 125, 0.98) 46%, rgba(8, 145, 178, 0.92) 100%);
  position: relative;
  overflow: hidden;
  box-shadow: 0 28px 64px rgba(15, 23, 42, 0.14);
}

.hero-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.14), transparent 24%),
    linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.06) 50%, transparent 100%);
  pointer-events: none;
}

.hero-copy,
.hero-visual {
  position: relative;
  z-index: 1;
}

.hero-eyebrow {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #7dd3fc;
  text-transform: uppercase;
}

.hero-title {
  margin: 0;
  font-family: 'Noto Serif SC', serif;
  font-size: 42px;
  line-height: 1.2;
  color: #f8fbff;
}

.hero-subtitle {
  max-width: 720px;
  margin: 16px 0 28px;
  font-size: 14px;
  line-height: 1.85;
  color: #c5defb;
}

.hero-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.hero-metric {
  min-width: 140px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero-metric-value {
  font-size: 24px;
  font-weight: 800;
  color: #ffffff;
}

.hero-metric-label {
  font-size: 12px;
  color: #b8d4f7;
}

.hero-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
}

.ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.ring-lg {
  width: 200px;
  height: 200px;
}

.ring-md {
  width: 148px;
  height: 148px;
  border-style: dashed;
  border-color: rgba(125, 211, 252, 0.35);
}

.ring-sm {
  width: 98px;
  height: 98px;
  border-color: rgba(103, 232, 249, 0.32);
}

.crown-core {
  width: 76px;
  height: 76px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #f59e0b, #fbbf24 48%, #fde68a 100%);
  box-shadow: 0 0 0 10px rgba(255, 255, 255, 0.06), 0 18px 36px rgba(15, 23, 42, 0.28);
}

.toolbar,
.podium-section,
.main-grid {
  max-width: 1400px;
  margin: 22px auto 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #dde8f5;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.05);
}

.toolbar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-pill {
  all: unset;
  cursor: pointer;
  padding: 8px 15px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #69809c;
  background: #f0f5fc;
  transition: all 0.18s ease;
}

.filter-pill.active,
.filter-pill:hover {
  color: #1d4ed8;
  background: #e0ecff;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.select-label {
  font-size: 12px;
  font-weight: 700;
  color: #6f86a3;
}

.course-select {
  height: 40px;
  min-width: 170px;
  padding: 0 14px;
  border: 1px solid #d6e4f3;
  border-radius: 12px;
  background: #f9fbfe;
  color: #1f3d63;
  font: 600 12px 'Sora', sans-serif;
  outline: none;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.section-head.compact {
  margin-bottom: 14px;
}

.section-eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #88a0bd;
  text-transform: uppercase;
}

.section-title {
  margin: 0;
  font-family: 'Noto Serif SC', serif;
  font-size: 24px;
  color: #13253f;
}

.section-note {
  font-size: 12px;
  color: #7d90a8;
}

/* FIX 2: 颁奖台视觉排布：2nd 左 | 1st 中 | 3rd 右，用 CSS order 控制 */
.podium-grid {
  display: flex;
  gap: 18px;
  align-items: flex-end;
}

.podium-card {
  flex: 1;
  padding: 26px 20px 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #dce8f6;
  text-align: center;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
  position: relative;
  overflow: hidden;
}

.podium-card::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.9;
  pointer-events: none;
}

/* 1st 居中、抬高 */
.podium-card.rank-1 {
  order: 2;
  padding-top: 34px;
  transform: translateY(-12px);
}

/* 2nd 左 */
.podium-card.rank-2 {
  order: 1;
}

/* 3rd 右 */
.podium-card.rank-3 {
  order: 3;
}

.podium-card.rank-1::before {
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.18), transparent 48%);
}

.podium-card.rank-2::before {
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.16), transparent 48%);
}

.podium-card.rank-3::before {
  background: linear-gradient(180deg, rgba(251, 146, 60, 0.14), transparent 48%);
}

.podium-rank {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #7388a4;
  text-transform: uppercase;
}

.podium-avatar {
  width: 64px;
  height: 64px;
  margin: 14px auto 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.22);
}

.podium-name {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #13253f;
}

.podium-course {
  margin: 6px 0 0;
  font-size: 12px;
  color: #7b90aa;
}

.podium-score {
  margin-top: 14px;
  font-size: 30px;
  font-weight: 800;
  color: #173f79;
}

.podium-badge {
  display: inline-flex;
  margin-top: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #2459a9;
  background: #e6f0ff;
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.9fr);
  gap: 20px;
}

.rank-panel,
.spotlight-card {
  border-radius: 24px;
  border: 1px solid #dce7f4;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
}

.rank-panel {
  padding: 24px;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rank-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1.2fr) minmax(260px, 0.95fr) 110px;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  background: #f8fbff;
  border: 1px solid #e5eef8;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.rank-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
  border-color: #cdddf2;
}

.rank-row.highlight {
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.72), rgba(240, 249, 255, 0.95));
  border-color: #93c5fd;
}

.rank-index {
  font-size: 24px;
  font-weight: 800;
  color: #9bb0c9;
  text-align: center;
}

.rank-user {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.rank-avatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  flex-shrink: 0;
}

.rank-user-meta {
  min-width: 0;
}

.rank-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.rank-name {
  font-size: 15px;
  font-weight: 800;
  color: #153354;
}

.rank-badge {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
}

.rank-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #7d92ab;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rank-metrics span,
.my-rank-stats span {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #597391;
  background: #eef4fb;
}

.rank-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.score-value {
  font-size: 24px;
  font-weight: 800;
  color: #163a63;
}

.score-delta {
  font-size: 12px;
  font-weight: 800;
}

.score-delta.up {
  color: #059669;
}

.score-delta.down {
  color: #dc2626;
}

.score-delta.flat {
  color: #94a3b8;
}

.side-panel {
  display: flex;
  flex-direction: column;
}

.spotlight-card {
  padding: 24px;
  height: fit-content;
}

.spotlight-title {
  margin: 0;
  font-size: 24px;
  font-family: 'Noto Serif SC', serif;
  color: #153354;
}

.insight-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
}

.insight-item {
  padding: 14px 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #f7fbff, #f1f7ff);
  border: 1px solid #e0ebf8;
}

.insight-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #7b90aa;
  text-transform: uppercase;
}

.insight-value {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 800;
  color: #13335b;
}

.insight-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.75;
  color: #6d84a0;
}

.my-rank-card {
  margin-top: 18px;
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.78), rgba(240, 249, 255, 0.96));
  border: 1px solid #bfdbfe;
}

.my-rank-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.my-rank-value {
  font-size: 34px;
  font-weight: 800;
  color: #1d4ed8;
}

.my-rank-course {
  font-size: 12px;
  color: #6f88a4;
}

.my-rank-avatar {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #0891b2);
}

.my-rank-desc {
  margin: 16px 0 0;
  font-size: 13px;
  line-height: 1.8;
  color: #4f6886;
}

.my-rank-desc strong {
  color: #1d4ed8;
}

.my-rank-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

@media (max-width: 1100px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

  .podium-grid {
    flex-direction: column;
  }

  .podium-card.rank-1,
  .podium-card.rank-2,
  .podium-card.rank-3 {
    order: unset;
    transform: none;
  }

  .rank-row {
    grid-template-columns: 44px 1fr;
  }

  .rank-metrics,
  .rank-score {
    grid-column: 2;
  }

  .rank-score {
    align-items: flex-start;
  }
}

@media (max-width: 820px) {
  .leaderboard-page {
    padding: 18px 14px 34px;
  }

  .top-nav,
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .nav-right,
  .toolbar-left,
  .toolbar-right {
    flex-wrap: wrap;
  }

  .hero-panel {
    grid-template-columns: 1fr;
    padding: 32px 24px;
  }

  .hero-title {
    font-size: 34px;
  }

  .hero-visual {
    min-height: 180px;
  }

  .rank-row {
    padding: 14px;
  }
}
</style>