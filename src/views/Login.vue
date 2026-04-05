<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/userStore'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const formRef = ref()
const canvasRef = ref()

const form = reactive({
  account: '',
  password: '',
  role: 'student',
})

const MOCK_ACCOUNT = Object.freeze({
  account: 'test',
  password: '123456',
})

const rules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

// ── Particle canvas ──────────────────────────────────────────
let animId = null
const initCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
  resize()
  window.addEventListener('resize', resize)

  const COUNT = 70
  const pts = Array.from({ length: COUNT }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    r: Math.random() * 1.6 + 0.4,
    o: Math.random() * 0.5 + 0.15,
  }))

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(130,200,255,${p.o})`
      ctx.fill()
    })
    pts.forEach((a, i) => {
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < 110) {
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(130,200,255,${0.15 * (1 - d / 110)})`
          ctx.lineWidth = 0.6
          ctx.stroke()
        }
      }
    })
    animId = requestAnimationFrame(draw)
  }
  draw()
}

onMounted(() => initCanvas())
onUnmounted(() => { cancelAnimationFrame(animId); window.removeEventListener('resize', () => { }) })

// ── Login logic ───────────────────────────────────────────────
const handleLogin = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  loading.value = true
  try {
    const isValid = form.account === MOCK_ACCOUNT.account && form.password === MOCK_ACCOUNT.password
    if (!isValid) { ElMessage.error('账号或密码错误，请使用测试账号'); return }
    const token = `mock-token-${Date.now()}`
    userStore.login({ userId: form.account, role: form.role }, token)
    ElMessage.success('登录成功')
    router.push('/home')
  } catch {
    ElMessage.error('登录失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Particle background -->
    <canvas ref="canvasRef" class="particle-canvas" />

    <!-- Background blobs -->
    <div class="blob blob-1" />
    <div class="blob blob-2" />
    <div class="blob blob-3" />

    <!-- Main layout -->
    <div class="layout">
      <!-- Left brand section -->
      <section class="brand-section">
        <div class="brand-inner">
          <div class="logo-mark">
            <span class="logo-icon">✦</span>
          </div>

          <div class="brand-text">
            <p class="brand-eyebrow">AI TEACHING PLATFORM</p>
            <h1 class="brand-title">AI互动<br><em>智课系统</em></h1>
            <p class="brand-desc">以人工智能重塑教与学的边界<br>让每一次课堂都成为专属体验</p>
          </div>

          <ul class="feature-list">
            <li>
              <span class="feat-icon">◈</span>
              <span class="feat-text"><strong>智能课程生成</strong> — 自动分析知识点，输出专业级讲稿</span>
            </li>
            <li>
              <span class="feat-icon">◈</span>
              <span class="feat-text"><strong>语音讲解引擎</strong> — 多种 TTS，媲美真人讲师</span>
            </li>
            <li>
              <span class="feat-icon">◈</span>
              <span class="feat-text"><strong>实时互动答疑</strong> — 丝滑响应，随时解惑</span>
            </li>
          </ul>

          <div class="brand-footer">
            <span class="badge">Beta v1.0</span>
            <span class="badge">Agent Powered</span>
          </div>
        </div>
      </section>

      <!-- Right login card -->
      <section class="card-section">
        <div class="glass-card">
          <div class="card-header">
            <h2>欢迎回来</h2>
            <p>请登录以继续使用智课平台</p>
          </div>

          <div class="hint-bar">
            <span class="hint-dot" />
            <span>测试账号 <strong>test</strong> · 密码 <strong>123456</strong></span>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @keyup.enter="handleLogin">
            <!-- Role toggle (moved to top for visual hierarchy) -->
            <el-form-item prop="role" class="role-item">
              <div class="role-toggle">
                <button type="button" :class="['role-btn', { active: form.role === 'student' }]"
                  @click="form.role = 'student'">
                  <span class="role-icon">🎓</span>学生
                </button>
                <button type="button" :class="['role-btn', { active: form.role === 'teacher' }]"
                  @click="form.role = 'teacher'">
                  <span class="role-icon">📐</span>教师
                </button>
              </div>
            </el-form-item>

            <el-form-item prop="account" class="field-item">
              <label class="field-label">账号</label>
              <div class="input-wrap">
                <span class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </span>
                <el-input v-model="form.account" placeholder="请输入账号" clearable />
              </div>
            </el-form-item>

            <el-form-item prop="password" class="field-item">
              <label class="field-label">密码</label>
              <div class="input-wrap">
                <span class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password clearable />
              </div>
            </el-form-item>

            <button type="button" class="submit-btn" :class="{ loading }" :disabled="loading" @click="handleLogin">
              <span v-if="!loading" class="btn-content">
                <span>立即登录</span>
                <span class="btn-arrow">→</span>
              </span>
              <span v-else class="btn-spinner">
                <span class="spinner-ring" />
                登录中…
              </span>
            </button>
          </el-form>

          <p class="card-footnote">登录即表示您同意平台使用条款与隐私政策</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

/* ── Reset & Root ────────────────────────────────────────── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.login-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #111d35;
  font-family: 'DM Sans', sans-serif;
}

/* ── Particle canvas ─────────────────────────────────────── */
.particle-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

/* ── Background blobs ────────────────────────────────────── */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}

.blob-1 {
  width: 700px;
  height: 700px;
  top: -200px;
  left: -120px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.32), transparent 70%);
  animation: blobFloat 14s ease-in-out infinite alternate;
}

.blob-2 {
  width: 550px;
  height: 550px;
  bottom: -120px;
  left: 18%;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.22), transparent 70%);
  animation: blobFloat 18s ease-in-out infinite alternate-reverse;
}

.blob-3 {
  width: 400px;
  height: 400px;
  top: 30%;
  right: -80px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.18), transparent 70%);
  animation: blobFloat 11s ease-in-out infinite alternate;
}

@keyframes blobFloat {
  from {
    transform: translate(0, 0) scale(1);
  }

  to {
    transform: translate(30px, 40px) scale(1.06);
  }
}

/* ── Layout ──────────────────────────────────────────────── */
.layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 500px;
  height: 100vh;
}

/* ── Brand section ───────────────────────────────────────── */
.brand-section {
  display: flex;
  align-items: center;
  padding: 60px 72px;
}

.brand-inner {
  max-width: 520px;
  animation: fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.logo-mark {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
  box-shadow: 0 0 40px rgba(37, 99, 235, 0.4);
}

.logo-icon {
  font-size: 22px;
  color: #fff;
}

.brand-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: #3b82f6;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.brand-title {
  font-family: 'DM Serif Display', serif;
  font-size: 60px;
  line-height: 1.15;
  color: #f0f6ff;
  margin-bottom: 20px;
}

.brand-title em {
  font-style: italic;
  background: linear-gradient(90deg, #60a5fa, #22d3ee);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-desc {
  font-size: 15px;
  line-height: 1.8;
  color: #6b7fa8;
  margin-bottom: 44px;
}

.feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 44px;
}

.feature-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.feat-icon {
  color: #3b82f6;
  font-size: 14px;
  margin-top: 3px;
  flex-shrink: 0;
}

.feat-text {
  font-size: 14px;
  color: #8ba0c0;
  line-height: 1.6;
}

.feat-text strong {
  color: #c4d4eb;
  font-weight: 600;
}

.brand-footer {
  display: flex;
  gap: 10px;
}

.badge {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.08);
}

/* ── Card section ────────────────────────────────────────── */
.card-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 44px;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(24px);
}

.glass-card {
  width: 100%;
  max-width: 420px;
  animation: fadeUp 0.9s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.card-header {
  margin-bottom: 28px;
}

.card-header h2 {
  font-family: 'DM Serif Display', serif;
  font-size: 30px;
  color: #eef2ff;
  margin-bottom: 6px;
}

.card-header p {
  font-size: 13px;
  color: #4e6080;
}

/* ── Hint bar ────────────────────────────────────────────── */
.hint-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(37, 99, 235, 0.1);
  border: 1px solid rgba(37, 99, 235, 0.2);
  font-size: 12.5px;
  color: #7ba5d8;
  margin-bottom: 24px;
}

.hint-bar strong {
  color: #93c5fd;
  font-weight: 600;
}

.hint-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 6px #3b82f6;
  flex-shrink: 0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.3;
  }
}

/* ── Role toggle ─────────────────────────────────────────── */
.role-item {
  margin-bottom: 20px;
}

:deep(.role-item .el-form-item__content) {
  display: block;
}

.role-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 5px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
}

.role-btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 40px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  color: #4e6080;
  transition: all 0.2s ease;
}

.role-btn:hover {
  color: #93c5fd;
}

.role-btn.active {
  background: linear-gradient(135deg, #1d4ed8, #0e7490);
  color: #e0f2fe;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);
}

.role-icon {
  font-size: 15px;
}

/* ── Fields ──────────────────────────────────────────────── */
.field-item {
  margin-bottom: 16px;
}

:deep(.field-item .el-form-item__content) {
  display: block;
}

:deep(.field-item .el-form-item__error) {
  color: #f87171;
  font-size: 11.5px;
  margin-top: 4px;
}

.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7a9abf;
  margin-bottom: 8px;
}

.input-wrap {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
  z-index: 2;
  display: flex;
}

:deep(.input-wrap .el-input__wrapper) {
  padding-left: 38px;
  height: 46px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 0 0 1.5px #dde4f0 inset;
  transition: box-shadow 0.2s;
}

:deep(.input-wrap .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1.5px #93c5fd inset;
}

:deep(.input-wrap .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px #3b82f6 inset, 0 0 18px rgba(59, 130, 246, 0.15);
}

:deep(.input-wrap .el-input__inner) {
  color: #1e293b;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  background: transparent;
}

:deep(.input-wrap .el-input__inner::placeholder) {
  color: #94a3b8;
}

:deep(.input-wrap .el-input__suffix) {
  color: #64748b;
}

/* ── Submit button ───────────────────────────────────────── */
.submit-btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  margin-top: 8px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%);
  box-shadow: 0 4px 24px rgba(29, 78, 216, 0.4), 0 1px 0 rgba(255, 255, 255, 0.1) inset;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  position: relative;
  overflow: hidden;
}

.submit-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent);
  pointer-events: none;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(29, 78, 216, 0.5), 0 1px 0 rgba(255, 255, 255, 0.12) inset;
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-arrow {
  font-size: 17px;
  transition: transform 0.2s;
}

.submit-btn:hover .btn-arrow {
  transform: translateX(3px);
}

.btn-spinner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spinner-ring {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Footnote ────────────────────────────────────────────── */
.card-footnote {
  text-align: center;
  font-size: 11px;
  color: #253448;
  margin-top: 18px;
  line-height: 1.6;
}

/* ── Animations ──────────────────────────────────────────── */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Responsive ──────────────────────────────────────────── */
</style>
