<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeaderBar from '@/components/PageHeaderBar.vue'
import { generateDashboardData } from '@/mock/dashboardData'

const route = useRoute()
const router = useRouter()

const courseId = computed(() => route.query.courseId || '')
const data = computed(() => generateDashboardData(courseId.value))

const breadcrumbs = computed(() => [
  { label: '首页', to: '/home' },
  { label: data.value.courseName, to: '/home' },
  { label: '数据反哺', current: true },
])

const kpiCards = computed(() => [
  {
    title: '累计交互次数',
    value: String(data.value.totalInteractions),
    unit: '次',
    trend: `↑ 较上节课活跃度提升 ${Math.floor(Math.random() * 10 + 15)}%`,
    trendColor: '#10b981',
  },
  {
    title: '最高危认知阻滞节点',
    value: data.value.dangerNode,
    trend: `课件第 ${data.value.dangerPage} 页，集中高频质询`,
    trendColor: '#ef4444',
    valueColor: '#ef4444',
  },
  {
    title: 'NLP 聚类置信度',
    value: data.value.nlpConfidence,
    trend: `共提取 ${data.value.clusters.length} 项核心概念错因`,
    trendColor: '#10b981',
    valueColor: '#4f46e5',
  },
  {
    title: '待处理教研建议',
    value: String(data.value.adviceCount),
    unit: '项',
    trend: '包含视觉与课件分支调整',
    trendColor: '#10b981',
    valueColor: '#10b981',
  },
])

const parseAdviceContent = (text) => {
  return text
    .replace(/\|([^|]+)\|/g, (_, inner) => {
      if (inner.startsWith('红') || inner.includes('高亮')) return `<span class="highlight-red">${inner}</span>`
      return `<span class="highlight-blue">${inner}</span>`
    })
}

const handleAdopt = () => {
  ElMessage.success('建议已采纳，课件配置已更新（演示）')
}

const goBack = () => router.push('/home')
</script>

<template>
  <div class="data-feedback-page">
    <!-- Top bar -->
    <header class="top-bar">
      <div class="top-left">
        <div class="logo" @click="goBack">✦ 知微智课</div>
        <div class="bar-divider" />
        <div class="unit-info">
          <span class="unit-label">{{ data.courseName }}</span>
          <span class="unit-detail">{{ data.courseUnit }}</span>
        </div>
      </div>
      <div class="top-right">
        <span class="audience-tag">{{ data.audience }} | {{ data.studentCount }}人</span>
        <span class="ai-running">● AI 引擎运行中</span>
        <el-button size="small" plain @click="goBack">返回首页</el-button>
      </div>
    </header>

    <div class="dashboard-scroll">
      <div class="dashboard-container">
        <PageHeaderBar
          title="学情数据与 AI 归因诊断"
          :subtitle="`系统基于无监督语义聚类算法，自动诊断「${data.courseName}」全班认知盲区，并逆向生成教案重构建议。`"
          :breadcrumbs="breadcrumbs"
        />

        <!-- KPI -->
        <div class="kpi-grid">
          <div v-for="kpi in kpiCards" :key="kpi.title" class="kpi-card">
            <div class="kpi-title">{{ kpi.title }}</div>
            <div class="kpi-value" :style="{ color: kpi.valueColor || '#111827' }">
              {{ kpi.value }}
              <span v-if="kpi.unit" class="kpi-unit">{{ kpi.unit }}</span>
            </div>
            <div class="kpi-trend" :style="{ color: kpi.trendColor }">{{ kpi.trend }}</div>
          </div>
        </div>

        <!-- Panels -->
        <div class="panel-grid">
          <!-- Left: Bar Chart -->
          <div class="panel">
            <div class="panel-header">
              <span>课件帧交互热力分布</span>
              <span class="panel-sub">X轴: 课件页 | Y轴: 提问频次</span>
            </div>

            <div class="bar-chart">
              <div v-for="bar in data.barData" :key="bar.page" class="bar-col">
                <div :class="['bar-val', { danger: bar.danger }]">{{ bar.val }}</div>
                <div :class="['bar', { danger: bar.danger }]" :style="{ height: bar.pct + '%' }" />
              </div>
            </div>
            <div class="x-axis">
              <span
                v-for="bar in data.barData"
                :key="'x-' + bar.page"
                :class="{ 'x-danger': bar.danger }"
              >{{ bar.page }}</span>
            </div>

            <div class="raw-query-box">
              <div class="raw-query-title">{{ data.dangerNode }} 原始非结构化语料捕获：</div>
              <div class="raw-query-list">
                <span v-for="q in data.rawQueries" :key="q" class="raw-tag">{{ q }}</span>
              </div>
            </div>
          </div>

          <!-- Right: AI Clustering & Recommendations -->
          <div class="panel">
            <div class="panel-header">
              <span>大模型学情聚类与教研反哺</span>
              <span class="ai-badge">AI 助教</span>
            </div>

            <div v-for="cluster in data.clusters" :key="cluster.label" class="cluster-row">
              <div class="c-info">
                <span><strong>{{ cluster.label }}</strong> ({{ cluster.desc }})</span>
                <span class="c-pct" :style="{ color: cluster.color }">{{ cluster.pct }}% ({{ cluster.count }}人)</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: cluster.pct + '%', background: cluster.color }" />
              </div>
            </div>

            <div class="action-box">
              <div class="action-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                下一代课件优化建议 (可一键下发至 {{ data.dangerNode }})
              </div>

              <div class="advice-list">
                <div v-for="advice in data.advices" :key="advice.title" class="advice-item">
                  <div :class="['advice-tag', advice.tagClass]">{{ advice.tag }}</div>
                  <div class="advice-content">
                    <strong>{{ advice.title }}</strong>
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <span v-html="parseAdviceContent(advice.content)" />
                  </div>
                </div>
              </div>

              <button class="action-btn" @click="handleAdopt">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                一键采纳建议：修改课件配置并更新发布
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-feedback-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f3f4f6;
}

/* ── Top Bar ─────────────────────────────────────────────── */
.top-bar {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  flex-shrink: 0;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  font-size: 18px;
  font-weight: 800;
  color: #1e3a5f;
  letter-spacing: -0.02em;
  cursor: pointer;
}

.bar-divider {
  width: 1px;
  height: 28px;
  background: #e5e7eb;
}

.unit-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.unit-label {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.unit-detail {
  font-size: 12px;
  color: #6b7280;
}

.top-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.audience-tag {
  font-size: 13px;
  color: #4b5563;
  padding: 4px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.ai-running {
  font-size: 13px;
  color: #10b981;
  font-weight: 600;
}

/* ── Dashboard Scroll ────────────────────────────────────── */
.dashboard-scroll {
  flex: 1;
  overflow-y: auto;
}

.dashboard-container {
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* ── KPI Grid ────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.kpi-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.kpi-title {
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 800;
}

.kpi-unit {
  font-size: 14px;
  color: #4b5563;
  font-weight: 400;
}

.kpi-trend {
  font-size: 12px;
  margin-top: 8px;
  font-weight: 500;
}

/* ── Panel Grid ──────────────────────────────────────────── */
.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.panel {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.panel-header {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-sub {
  font-size: 12px;
  font-weight: 400;
  color: #4b5563;
}

/* ── AI Badge ────────────────────────────────────────────── */
.ai-badge {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.2);
  line-height: 1;
  letter-spacing: 0.5px;
}

/* ── Bar Chart ───────────────────────────────────────────── */
@keyframes pulse-alert {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 180px;
  margin-bottom: 12px;
  border-bottom: 2px solid #f3f4f6;
  padding-bottom: 8px;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  margin: 0 3px;
}

.bar {
  width: 100%;
  background: #93c5fd;
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
  cursor: pointer;
}

.bar:hover {
  background: #3b82f6;
}

.bar.danger {
  background: #ef4444;
  animation: pulse-alert 2s infinite;
}

.bar-val {
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  margin-bottom: 4px;
}

.bar-val.danger {
  color: #ef4444;
  font-size: 16px;
}

.x-axis {
  display: flex;
  justify-content: space-between;
  color: #9ca3af;
  font-size: 11px;
  padding: 0 2px;
}

.x-axis span {
  flex: 1;
  text-align: center;
  white-space: nowrap;
}

.x-danger {
  color: #ef4444 !important;
  font-weight: 700;
}

/* ── Raw Query ───────────────────────────────────────────── */
.raw-query-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  margin-top: 24px;
}

.raw-query-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.raw-query-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.raw-tag {
  background: #fff;
  border: 1px solid #e5e7eb;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #4b5563;
  line-height: 1.6;
}

/* ── Clusters ────────────────────────────────────────────── */
.cluster-row {
  margin-bottom: 16px;
}

.c-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 6px;
  font-weight: 500;
}

.c-info strong {
  color: #111827;
}

.c-pct {
  font-weight: 700;
  white-space: nowrap;
}

.progress-track {
  height: 8px;
  background: #f3f4f6;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.8s ease;
}

/* ── Action Box ──────────────────────────────────────────── */
.action-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  margin-top: auto;
  position: relative;
  overflow: hidden;
}

.action-box::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #4f46e5;
}

.action-title {
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.advice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.advice-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fff;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.advice-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.tag-visual {
  background: #e0f2fe;
  color: #0284c7;
}

.tag-branch {
  background: #dcfce7;
  color: #15803d;
}

.advice-content {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
}

.advice-content strong {
  color: #1e293b;
  font-size: 13px;
  display: block;
  margin-bottom: 4px;
}

.advice-content :deep(.highlight-red) {
  color: #dc2626;
  font-weight: 600;
  background: #fee2e2;
  padding: 0 4px;
  border-radius: 2px;
}

.advice-content :deep(.highlight-blue) {
  color: #2563eb;
  font-weight: 600;
  background: #dbeafe;
  padding: 0 4px;
  border-radius: 2px;
}

.action-btn {
  background: #4f46e5;
  color: #fff;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.action-btn:hover {
  background: #4338ca;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}
</style>
