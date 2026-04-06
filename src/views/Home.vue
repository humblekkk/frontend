<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { readGeneratedCourses } from '@/mock/demoCourses'
import { useLessonStore } from '@/store/lessonStore'
import { useUserStore } from '@/store/userStore'

const router = useRouter()
const lessonStore = useLessonStore()
const userStore = useUserStore()

const courseList = ref([
  {
    id: 'course-1',
    name: '人工智能导论',
    desc: '从零开始理解 AI 核心原理，涵盖感知机、神经网络与深度学习入门。',
    tag: 'AI · 入门',
    progress: 68,
    lessons: 24,
    hours: 18,
    color: '#2563eb',
    img: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80',
  },
  {
    id: 'course-2',
    name: '机器学习基础',
    desc: '掌握监督学习、无监督学习与模型评估方法，动手实践 sklearn。',
    tag: 'ML · 进阶',
    progress: 42,
    lessons: 32,
    hours: 26,
    color: '#0891b2',
    img: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80',
  },
  {
    id: 'course-3',
    name: '数据结构与算法',
    desc: '系统学习树、图、排序与动态规划，夯实编程竞赛与面试基础。',
    tag: 'CS · 核心',
    progress: 15,
    lessons: 40,
    hours: 35,
    color: '#7c3aed',
    img: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600&q=80',
  },
  {
    id: 'course-4',
    name: 'Python 程序设计',
    desc: '从语法基础到面向对象编程，配合真实项目案例快速上手 Python。',
    tag: 'Python · 基础',
    progress: 90,
    lessons: 28,
    hours: 20,
    color: '#059669',
    img: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&q=80',
  },
])

onMounted(() => {
  const generatedCourses = readGeneratedCourses()
  if (!generatedCourses.length) {
    return
  }

  courseList.value = [
    ...courseList.value.filter((item) => !generatedCourses.some((course) => course.id === item.id)),
    ...generatedCourses,
  ]
})

const canEnterTeacherPage = computed(() => userStore.isTeacher)
const currentUserName = computed(() => userStore.userInfo.userId || '未知用户')
const currentRole = computed(() => (userStore.isTeacher ? '教师' : '学生'))
const userInitial = computed(() => {
  const name = currentUserName.value
  return name ? String(name).slice(0, 1).toUpperCase() : 'U'
})

const enterLesson = (course) => {
  lessonStore.setCourseInfo({
    courseId: course.id,
    courseName: course.name,
    courseDesc: course.desc,
  })
  router.push({
    path: '/lesson/player',
    query: {
      courseId: course.id,
      lessonId: course.lessonId || '1',
    },
  })
}

const goHome = () => router.push('/home')
const goLearningPath = () => router.push('/learning-path')
const goLeaderboard = () => router.push('/leaderboard')
const goTeacherUpload = () => router.push('/teacher/upload')
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确认退出吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    userStore.logout()
    router.push('/login')
  } catch {
    // 用户取消退出
  }
}

// ── AI Chat ──────────────────────────────────────────────────
const chatOpen = ref(false)
const chatInput = ref('')
const chatLoading = ref(false)
const messagesEl = ref(null)

const messages = ref([
  { role: 'ai', text: '你好！我是你的 AI 学习助手 ✦\n有任何课程问题，随时问我吧～' },
])

const scrollToBottom = () => {
  setTimeout(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }, 50)
}

const sendMessage = async () => {
  const text = chatInput.value.trim()
  if (!text || chatLoading.value) return
  chatInput.value = ''
  messages.value.push({ role: 'user', text })
  scrollToBottom()
  chatLoading.value = true

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: '你是一个专业的 AI 教育助手，帮助学生解答课程中的问题。用简洁友好的中文回答，可以使用 emoji，每次回答不超过 150 字。',
        messages: messages.value
          .filter(m => m.role !== 'ai' || messages.value.indexOf(m) > 0)
          .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
      }),
    })
    const data = await res.json()
    const reply = data.content?.map(b => b.text || '').join('') || '抱歉，我暂时无法回答这个问题。'
    messages.value.push({ role: 'ai', text: reply })
  } catch {
    messages.value.push({ role: 'ai', text: '学好机器学习，核心不是“看了多少模型”，而是按对的顺序把三层东西打牢：数学直觉 → 编程实现 → 建模思维。初学者最该避免的是一上来就沉迷各种新模型名词。先把基础吃透，后面学得会非常快。' })
  } finally {
    chatLoading.value = false
    scrollToBottom()
  }
}

const quickQuestions = ['怎么学好机器学习？', 'Python 适合零基础吗？', '推荐学习路径？']
const askQuick = (q) => { chatInput.value = q; sendMessage() }
</script>

<template>
  <div class="home-page">

    <!-- ── Top nav ─────────────────────────────── -->
    <header class="top-nav">
      <div class="nav-left">
        <div class="nav-logo" @click="goHome">✦ 智课</div>
        <nav class="nav-links">
          <a class="nav-link active">已有课程</a>
          <a class="nav-link" @click="goLearningPath">学习路径</a>
          <a class="nav-link" @click="goLeaderboard">排行榜</a>
        </nav>
      </div>
      <div class="nav-right">
        <div class="user-mini">
          <div class="user-texts">
            <span class="user-name">{{ currentUserName }}</span>
            <span class="user-role">{{ currentRole }}</span>
          </div>
          <div class="avatar">{{ userInitial }}</div>
        </div>
        <el-button class="logout-btn" plain @click="handleLogout">退出</el-button>
      </div>
    </header>

    <!-- ── Hero banner ────────────────────────── -->
    <section class="hero">
      <div class="hero-content">
        <p class="hero-eyebrow">✦ AI POWERED LEARNING</p>
        <h1 class="hero-title">继续你的<br><em>学习旅程</em></h1>
        <p class="hero-sub">4 门课程正在进行 · 距下一个里程碑还差 2 步</p>
        <div class="hero-stats">
          <div class="stat"><span class="stat-num">3</span><span class="stat-label">学习天数</span></div>
          <div class="stat-div" />
          <div class="stat"><span class="stat-num">54%</span><span class="stat-label">平均进度</span></div>
          <div class="stat-div" />
          <div class="stat"><span class="stat-num">12</span><span class="stat-label">累计分钟</span></div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-ring hero-ring-1" />
        <div class="hero-ring hero-ring-2" />
        <div class="hero-ring hero-ring-3" />
        <div class="hero-orb">
          <span>AI</span>
        </div>
      </div>
    </section>

    <!-- ── Section title ──────────────────────── -->
    <div class="section-head">
      <h2 class="section-title">我的课程</h2>
      <span class="section-count">{{ courseList.length }} 门</span>
    </div>

    <!-- ── Course grid ────────────────────────── -->
    <div class="course-grid">
      <div v-for="(course, i) in courseList" :key="course.id" class="course-card"
        :style="{ '--accent': course.color, animationDelay: `${i * 0.08}s` }" @click="enterLesson(course)">
        <!-- Cover image -->
        <div class="card-cover">
          <img :src="course.img" :alt="course.name" loading="lazy" />
          <div class="card-cover-overlay" />
          <span class="card-tag">{{ course.tag }}</span>
        </div>

        <!-- Card body -->
        <div class="card-body">
          <h3 class="card-title">{{ course.name }}</h3>
          <p class="card-desc">{{ course.desc }}</p>

          <div class="card-meta">
            <span class="meta-item">📚 {{ course.lessons }} 节</span>
            <span class="meta-item">⏱ {{ course.hours }}h</span>
          </div>

          <!-- Progress -->
          <div class="progress-row">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: course.progress + '%' }" />
            </div>
            <span class="progress-pct">{{ course.progress }}%</span>
          </div>

          <button class="enter-btn">
            <span>进入学习</span>
            <span class="enter-arrow">→</span>
          </button>
        </div>
      </div>

      <!-- ── 教师上传入口卡（仅教师可见）──────── -->
      <div v-if="canEnterTeacherPage" class="course-card upload-card" @click="goTeacherUpload">
        <div class="upload-card-inner">
          <div class="upload-icon-ring">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h3 class="upload-card-title">上传新课程</h3>
          <p class="upload-card-desc">上传 PPT 或 PDF，AI 自动解析结构、生成讲解脚本</p>
          <div class="upload-card-tags">
            <span class="upload-tag">📄 PPT / PDF</span>
            <span class="upload-tag">✨ AI 解析</span>
            <span class="upload-tag">📝 脚本生成</span>
          </div>
          <div class="upload-cta">
            <span>前往上传</span>
            <span class="enter-arrow">→</span>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- ── AI Chat bubble ─────────────────────── -->
  <div class="chat-root">
    <transition name="chat-panel">
      <div v-if="chatOpen" class="chat-panel">
        <div class="chat-header">
          <div class="chat-header-left">
            <div class="chat-avatar-sm">✦</div>
            <div>
              <p class="chat-name">AI 学习助手</p>
              <p class="chat-status"><span class="status-dot" />在线</p>
            </div>
          </div>
          <button class="chat-close" @click="chatOpen = false">✕</button>
        </div>

        <div ref="messagesEl" class="chat-messages">
          <div v-for="(msg, i) in messages" :key="i" :class="['msg-row', msg.role]">
            <div v-if="msg.role === 'ai'" class="msg-icon">✦</div>
            <div class="msg-bubble">{{ msg.text }}</div>
          </div>
          <div v-if="chatLoading" class="msg-row ai">
            <div class="msg-icon">✦</div>
            <div class="msg-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        </div>

        <div class="quick-row">
          <button v-for="q in quickQuestions" :key="q" class="quick-chip" @click="askQuick(q)">{{ q }}</button>
        </div>

        <div class="chat-input-row">
          <input v-model="chatInput" class="chat-input" placeholder="问我任何问题…" @keydown.enter="sendMessage" />
          <button class="send-btn" :disabled="chatLoading" @click="sendMessage">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </transition>

    <button class="chat-fab" @click="chatOpen = !chatOpen">
      <span v-if="!chatOpen" class="fab-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </span>
      <span v-else class="fab-icon">✕</span>
      <span class="fab-badge" />
    </button>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Noto+Serif+SC:wght@600;700&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.home-page {
  min-height: 100vh;
  background: #f4f6fb;
  font-family: 'Sora', sans-serif;
  padding-bottom: 120px;
}

/* ── Nav ──────────────────────────────────────────────────── */
.top-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  height: 64px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-logo {
  font-size: 18px;
  font-weight: 800;
  color: #1e3a5f;
  letter-spacing: -0.02em;
  cursor: pointer;
}

.nav-links {
  display: flex;
  gap: 4px;
}

.nav-link {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.nav-link:hover,
.nav-link.active {
  background: #eff6ff;
  color: #2563eb;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-mini {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px 4px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5ecf7;
}

.user-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f3c5b;
  font-size: 12px;
  font-weight: 700;
}

.user-role {
  color: #6e8097;
  font-size: 11px;
  line-height: 1;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

.logout-btn {
  height: 34px !important;
  min-width: 84px !important;
  padding: 0 16px !important;
  border-radius: 10px !important;
  border-color: #ffd6d6 !important;
  color: #d64f4f !important;
  background: #fff7f7 !important;
  font-size: 12px !important;
  font-weight: 600 !important;
}

/* ── Hero ─────────────────────────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 40px;
  margin: 28px 40px 0;
  padding: 48px 56px;
  border-radius: 24px;
  background: linear-gradient(135deg, #0f2550 0%, #1a4480 50%, #0e6fa8 100%);
  overflow: hidden;
  position: relative;
  animation: fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: #60a5fa;
  margin-bottom: 12px;
}

.hero-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 48px;
  line-height: 1.2;
  color: #f0f9ff;
  margin-bottom: 14px;
}

.hero-title em {
  font-style: normal;
  background: linear-gradient(90deg, #60a5fa, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-sub {
  font-size: 14px;
  color: #93c5fd;
  margin-bottom: 32px;
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  color: #7dd3fc;
  font-weight: 500;
}

.stat-div {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.15);
}

.hero-visual {
  position: relative;
  width: 160px;
  height: 160px;
  flex-shrink: 0;
  z-index: 1;
}

.hero-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.hero-ring-1 {
  width: 160px;
  height: 160px;
  animation: spin 20s linear infinite;
}

.hero-ring-2 {
  width: 120px;
  height: 120px;
  border-style: dashed;
  animation: spin 14s linear infinite reverse;
  border-color: rgba(96, 165, 250, 0.25);
}

.hero-ring-3 {
  width: 80px;
  height: 80px;
  animation: spin 8s linear infinite;
  border-color: rgba(52, 211, 153, 0.3);
}

.hero-orb {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  box-shadow: 0 0 40px rgba(37, 99, 235, 0.5);
}

@keyframes spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

/* ── Section head ─────────────────────────────────────────── */
.section-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 40px 40px 20px;
}

.section-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 22px;
  color: #0f172a;
  font-weight: 700;
}

.section-count {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

/* ── Course grid ──────────────────────────────────────────── */
.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 0 40px;
}

.course-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.course-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.06);
}

.card-cover {
  position: relative;
  height: 170px;
  overflow: hidden;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.course-card:hover .card-cover img {
  transform: scale(1.06);
}

.card-cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 40%, rgba(0, 0, 0, 0.45));
}

.card-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: rgba(255, 255, 255, 0.92);
  color: var(--accent);
  backdrop-filter: blur(8px);
}

.card-body {
  padding: 18px 20px 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
  line-height: 1.4;
}

.card-desc {
  font-size: 12.5px;
  color: #64748b;
  line-height: 1.65;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  gap: 14px;
  margin-bottom: 14px;
}

.meta-item {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.progress-track {
  flex: 1;
  height: 5px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #34d399));
  border-radius: 999px;
  transition: width 1s cubic-bezier(0.22, 1, 0.36, 1);
}

.progress-pct {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  min-width: 32px;
  text-align: right;
}

.enter-btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
  font-size: 13.5px;
  font-weight: 600;
  transition: background 0.2s;
}

.enter-btn:hover {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
}

.enter-arrow {
  font-size: 16px;
  transition: transform 0.2s;
}

.course-card:hover .enter-arrow {
  transform: translateX(3px);
}

/* ── 教师上传卡 ───────────────────────────────────────────── */
.upload-card {
  background: linear-gradient(145deg, #f0f7ff, #e8f3ff) !important;
  border: 2px dashed #93c5fd;
  box-shadow: none !important;
}

.upload-card:hover {
  transform: translateY(-6px);
  border-color: #3b82f6;
  box-shadow: 0 16px 40px rgba(37, 99, 235, 0.12) !important;
}

.upload-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 44px 24px 36px;
  text-align: center;
  min-height: 360px;
}

.upload-icon-ring {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.upload-card:hover .upload-icon-ring {
  transform: scale(1.1) translateY(-2px);
}

.upload-card-title {
  font-size: 17px;
  font-weight: 700;
  color: #1e3a5f;
  line-height: 1.3;
}

.upload-card-desc {
  font-size: 12.5px;
  color: #64748b;
  line-height: 1.7;
  max-width: 210px;
}

.upload-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.upload-tag {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.15);
}

.upload-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  background: rgba(37, 99, 235, 0.09);
  color: #2563eb;
  font-size: 13.5px;
  font-weight: 600;
  transition: background 0.2s;
  margin-top: 4px;
}

.upload-card:hover .upload-cta {
  background: rgba(37, 99, 235, 0.15);
}

/* ── AI Chat ──────────────────────────────────────────────── */
.chat-root {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.chat-panel {
  width: 340px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.18), 0 4px 16px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #0f2550, #1a4480);
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-avatar-sm {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
  font-weight: 700;
}

.chat-name {
  font-size: 13.5px;
  font-weight: 700;
  color: #f0f9ff;
}

.chat-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #7dd3fc;
  margin-top: 1px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 6px #34d399;
  animation: pulse 2s infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1
  }

  50% {
    opacity: 0.4
  }
}

.chat-close {
  all: unset;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s;
}

.chat-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.chat-messages {
  height: 280px;
  overflow-y: auto;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 4px;
}

.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.msg-row.user {
  flex-direction: row-reverse;
}

.msg-icon {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
}

.msg-bubble {
  max-width: 78%;
  padding: 9px 13px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.msg-row.ai .msg-bubble {
  background: #f1f5f9;
  color: #1e293b;
  border-bottom-left-radius: 4px;
}

.msg-row.user .msg-bubble {
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg-bubble.typing {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 16px;
}

.msg-bubble.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
  animation: bounce 1.2s ease-in-out infinite;
}

.msg-bubble.typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.msg-bubble.typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {

  0%,
  60%,
  100% {
    transform: translateY(0)
  }

  30% {
    transform: translateY(-6px)
  }
}

.quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 14px;
  border-top: 1px solid #f1f5f9;
}

.quick-chip {
  all: unset;
  cursor: pointer;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  transition: all 0.15s;
  white-space: nowrap;
}

.quick-chip:hover {
  background: #dbeafe;
}

.chat-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 14px;
  border-top: 1px solid #f1f5f9;
}

.chat-input {
  flex: 1;
  height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  font-size: 13px;
  font-family: 'Sora', sans-serif;
  color: #0f172a;
  outline: none;
  transition: border-color 0.2s;
  background: #f8fafc;
}

.chat-input:focus {
  border-color: #3b82f6;
  background: #fff;
}

.chat-input::placeholder {
  color: #cbd5e1;
}

.send-btn {
  all: unset;
  cursor: pointer;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.2s, transform 0.15s;
}

.send-btn:hover {
  opacity: 0.9;
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.chat-fab {
  all: unset;
  cursor: pointer;
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0f2550, #1a4480);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}

.chat-fab:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 32px rgba(37, 99, 235, 0.5);
}

.fab-icon {
  font-size: 20px;
  display: flex;
}

.fab-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34d399;
  border: 2px solid #fff;
  box-shadow: 0 0 8px #34d399;
}

.chat-panel-enter-active {
  animation: panelIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.chat-panel-leave-active {
  animation: panelOut 0.2s ease;
}

@keyframes panelIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes panelOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  to {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
