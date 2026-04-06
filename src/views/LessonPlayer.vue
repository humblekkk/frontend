<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getLessonPreviewImageUrl, getLessonPreviewMeta } from '@/api/lesson'
import { trackProgress } from '@/api/progress'
import ChatBox from '@/components/ChatBox.vue'
import { useLessonStore } from '@/store/lessonStore'

const route = useRoute()
const router = useRouter()
const lessonStore = useLessonStore()

const { platformContext, courseInfo, lessonInfo, explainStatus, learningProgress, sessionInfo, currentSection, highlightedPages } = storeToRefs(lessonStore)

const catalogCollapsed = ref(false)
const showResumePrompt = ref(false)
const voiceProgress = ref(0)
const noteText = ref('')
const noteSavedAt = ref('')
const quickReviewPoints = ref([])
const activeRightTab = ref('chat')
const controlsVisible = ref(true)
const catalogOpen = ref(false)
const teachingPace = ref('中')
const switchingTeachingPace = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const previewSlideCount = ref(0)
const previewImageFailed = ref(false)
const previewImageVersion = ref(0)
const previewTaskStatus = ref('idle')
const lastQaRecordId = ref('')
let voiceTimer = null
let hideControlsTimer = null
let previewPollTimer = null
let progressTrackTimer = null

const normalizeQuery = (v, d = '') => (Array.isArray(v) ? v[0] || d : (typeof v === 'string' ? v : d))
const syncContext = () => {
  lessonStore.syncPlatformContext({
    courseId: normalizeQuery(route.query.courseId, courseInfo.value.courseId),
    userId: normalizeQuery(route.query.userId, platformContext.value.userId),
    lessonId: normalizeQuery(route.query.lessonId, lessonInfo.value.lessonId),
    role: normalizeQuery(route.query.role, platformContext.value.role),
    token: normalizeQuery(route.query.token, platformContext.value.token),
  })
}

const statusMap = {
  idle: { text: '待开始', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', dot: '#94a3b8' },
  explaining: { text: '讲解中', color: '#34d399', bg: 'rgba(52,211,153,0.15)', dot: '#10b981' },
  paused: { text: '已暂停', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', dot: '#f59e0b' },
  qa: { text: '问答中', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', dot: '#3b82f6' },
}
const statusDisplay = computed(() => statusMap[explainStatus.value] || statusMap.idle)
const sectionOptions = computed(() => lessonInfo.value.sections || [])
const isExplaining = computed(() => explainStatus.value === 'explaining')
const canResume = computed(() => explainStatus.value === 'paused')
const effectiveTotalPages = computed(() => {
  const previewTotal = Number(previewSlideCount.value || 0)
  if (previewTotal > 0) {
    return previewTotal
  }
  return Math.max(1, Number(lessonInfo.value.totalPages || 1))
})
const safeCurrentPage = computed(() => {
  const page = Number(lessonInfo.value.currentPage || 1)
  const max = effectiveTotalPages.value
  return Math.min(Math.max(1, page), max)
})
const canPrevPage = computed(() => safeCurrentPage.value > 1)
const canNextPage = computed(() => safeCurrentPage.value < effectiveTotalPages.value)
const currentLessonId = computed(() => (
  platformContext.value.lessonId
  || lessonInfo.value.lessonId
  || normalizeQuery(route.query.lessonId)
))
const previewReady = computed(() => (
  Boolean(currentLessonId.value)
  && previewSlideCount.value > 0
))
const carouselSlides = computed(() => {
  if (!previewReady.value) {
    return []
  }
  return Array.from({ length: previewSlideCount.value }, (_, index) => {
    const slideNumber = index + 1
    return {
      slideNumber,
      active: slideNumber === safeCurrentPage.value,
    }
  })
})
const currentPreviewImageUrl = computed(() => {
  if (!previewReady.value) {
    return ''
  }
  return getLessonPreviewImageUrl(currentLessonId.value, safeCurrentPage.value, {
    v: previewImageVersion.value,
  })
})
const previewPlaceholderText = computed(() => {
  if (previewLoading.value || previewTaskStatus.value === 'processing') {
    return '正在加载 PPT 预览...'
  }
  return previewError.value || 'PPT 预览加载失败'
})
const catalogItems = computed(() => sectionOptions.value.map((item, index) => ({
  id: item.sectionId,
  title: item.title || `章节 ${index + 1}`,
  desc: (item.keywords || []).slice(0, 3).join(' | ') || '暂无简介',
})))
const playbackPages = computed(() => {
  if (previewSlideCount.value > 0) return Array.from({ length: effectiveTotalPages.value }, (_, i) => i + 1)
  const secPages = currentSection.value?.relatedPages || []
  if (secPages.length) return [...new Set(secPages.map(Number).filter(Number.isFinite))]
  if (highlightedPages.value?.length) return [...new Set(highlightedPages.value.map(Number).filter(Number.isFinite))]
  return Array.from({ length: effectiveTotalPages.value }, (_, i) => i + 1)
})
const progressReportBucket = computed(() => Math.floor(Math.max(0, Math.min(100, voiceProgress.value)) / 10))

const noteStorageKey = computed(() => `lesson-note:${courseInfo.value.courseId || platformContext.value.courseId}:${lessonInfo.value.lessonId}`)
const loadNote = () => {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(noteStorageKey.value)
  if (!raw) return
  try {
    const payload = JSON.parse(raw)
    noteText.value = payload.text || ''
    noteSavedAt.value = payload.savedAt || ''
    quickReviewPoints.value = Array.isArray(payload.quickPoints) ? payload.quickPoints : []
  } catch { localStorage.removeItem(noteStorageKey.value) }
}
const persistNote = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(noteStorageKey.value, JSON.stringify({ text: noteText.value, savedAt: noteSavedAt.value, quickPoints: quickReviewPoints.value }))
}
const saveNote = () => { noteSavedAt.value = new Date().toISOString(); persistNote(); ElMessage.success('笔记已保存') }
const clearNote = () => { noteText.value = ''; noteSavedAt.value = ''; quickReviewPoints.value = []; persistNote() }
const appendQuickPoint = (point) => {
  if (!point) return
  noteText.value = noteText.value ? `${noteText.value}\n- ${point}` : `- ${point}`
}

const clearPreviewPollTimer = () => {
  if (previewPollTimer) {
    clearTimeout(previewPollTimer)
    previewPollTimer = null
  }
}

const schedulePreviewRefresh = (delay = 2500) => {
  clearPreviewPollTimer()
  previewPollTimer = setTimeout(() => {
    loadPreviewMeta({ silent: true })
  }, delay)
}

const loadPreviewMeta = async ({ silent = false } = {}) => {
  if (!currentLessonId.value) {
    previewSlideCount.value = 0
    previewImageFailed.value = false
    previewTaskStatus.value = 'idle'
    previewError.value = ''
    clearPreviewPollTimer()
    return
  }

  previewLoading.value = !silent
  if (!silent) {
    previewError.value = ''
  }
  previewImageFailed.value = false

  try {
    const previewData = await getLessonPreviewMeta(currentLessonId.value)
    previewTaskStatus.value = previewData?.taskStatus || 'idle'
    previewSlideCount.value = Math.max(0, Number(previewData?.slideCount || 0))
    if (previewSlideCount.value > 0) {
      previewImageVersion.value += 1
      lessonStore.setLessonInfo({
        totalPages: previewSlideCount.value,
        currentPage: Math.min(
          Math.max(1, Number(lessonInfo.value.currentPage || 1)),
          previewSlideCount.value,
        ),
      })
    } else if (previewData?.errorMessage) {
      previewError.value = previewData.errorMessage
    }

    if (previewTaskStatus.value === 'processing') {
      schedulePreviewRefresh()
    } else {
      clearPreviewPollTimer()
    }
  } catch (error) {
    previewSlideCount.value = 0
    previewImageFailed.value = false
    previewTaskStatus.value = 'failed'
    previewError.value = error?.response?.data?.msg || error?.message || 'PPT 预览加载失败'
    clearPreviewPollTimer()
  } finally {
    previewLoading.value = false
  }
}

const handlePreviewImageError = () => {
  previewImageFailed.value = true
  previewError.value = previewError.value || 'PPT 预览图片加载失败'
}

const reportLearningProgress = async ({ qaRecordId = '' } = {}) => {
  if (!platformContext.value.userId || !currentLessonId.value || !lessonInfo.value.currentSectionId) {
    return
  }

  try {
    const result = await trackProgress({
      userId: platformContext.value.userId,
      courseId: platformContext.value.courseId || courseInfo.value.courseId,
      lessonId: currentLessonId.value,
      currentSectionId: lessonInfo.value.currentSectionId,
      progressPercent: Math.round(Math.max(0, Math.min(100, voiceProgress.value))),
      qaRecordId: qaRecordId || lastQaRecordId.value,
    })

    if (typeof result?.totalProgress === 'number') {
      lessonStore.setLearningProgress({ overallProgress: result.totalProgress })
    }
  } catch {
    // ignore progress tracking failures in the playback UI
  }
}

const scheduleLearningProgressReport = (options = {}) => {
  clearTimeout(progressTrackTimer)
  progressTrackTimer = setTimeout(() => {
    reportLearningProgress(options)
  }, 250)
}

const clearVoiceTimer = () => { if (voiceTimer) { clearInterval(voiceTimer); voiceTimer = null } }
const syncPageByProgress = () => {
  const pages = playbackPages.value
  if (!pages.length) return
  const index = Math.min(pages.length - 1, Math.floor((voiceProgress.value / 100) * pages.length))
  const page = Number(pages[index])
  if (Number.isFinite(page) && page !== Number(lessonInfo.value.currentPage)) lessonStore.setCurrentPage(page)
}
const runVoiceProgress = () => {
  clearVoiceTimer()
  voiceTimer = setInterval(() => {
    if (explainStatus.value !== 'explaining') return
    voiceProgress.value = Math.min(100, voiceProgress.value + 1.6)
    syncPageByProgress()
    if (voiceProgress.value >= 100) lessonStore.setExplainStatus('paused')
  }, 500)
}

const startExplain = () => { if (voiceProgress.value >= 100) voiceProgress.value = 0; lessonStore.setExplainStatus('explaining') }
const pauseExplain = () => lessonStore.setExplainStatus('paused')
const resumeExplain = () => { if (voiceProgress.value >= 100) voiceProgress.value = 0; lessonStore.setExplainStatus('explaining') }

const goPrevPage = () => { if (canPrevPage.value) lessonStore.setCurrentPage(safeCurrentPage.value - 1) }
const goNextPage = () => { if (canNextPage.value) lessonStore.setCurrentPage(safeCurrentPage.value + 1) }
const goToPage = (page) => {
  const nextPage = Number(page)
  if (Number.isInteger(nextPage) && nextPage >= 1 && nextPage <= effectiveTotalPages.value) {
    lessonStore.setCurrentPage(nextPage)
  }
}

const handleSectionChange = (sectionId) => {
  lessonStore.setCurrentSection(sectionId)
  voiceProgress.value = 0
  if (previewSlideCount.value > 0) {
    const targetIndex = sectionOptions.value.findIndex((item) => item.sectionId === sectionId)
    if (targetIndex >= 0) {
      lessonStore.setCurrentPage(Math.min(previewSlideCount.value, targetIndex + 1))
    }
  } else {
    syncPageByProgress()
  }
  if (explainStatus.value !== 'paused') lessonStore.setExplainStatus('explaining')
  catalogOpen.value = false
}
const handleQaFinished = async (payload) => {
  lessonStore.setExplainStatus('qa')
  if (payload?.understandingLevel) lessonStore.setLearningProgress({ understandingLevel: payload.understandingLevel })
  if (payload?.answerId) lastQaRecordId.value = payload.answerId
  if (Array.isArray(payload?.suggestions) && payload.suggestions.length) {
    quickReviewPoints.value = [...new Set([...quickReviewPoints.value, ...payload.suggestions])].slice(0, 6)
  }
  persistNote()
  scheduleLearningProgressReport({ qaRecordId: payload?.answerId || '' })
  showResumePrompt.value = true
}
const continueLecture = () => { showResumePrompt.value = false; lessonStore.setExplainStatus('explaining') }
const keepQaMode = () => { showResumePrompt.value = false; lessonStore.setExplainStatus('qa') }
const backToHome = () => router.push('/home')
const switchTeachingPace = async (pace) => {
  if (!pace || switchingTeachingPace.value) {
    return
  }

  switchingTeachingPace.value = true

  try {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    teachingPace.value = pace
    ElMessage.success('切换授课节奏成功')
  } finally {
    switchingTeachingPace.value = false
  }
}

const goToPracticeGame = () => {
  router.push({
    path: '/lesson/game',
    query: {
      ...route.query,
      courseName: courseInfo.value.courseName || '',
      lessonTitle: lessonInfo.value.lessonTitle || '',
      sectionTitle: currentSection.value?.title || '',
      currentPage: String(safeCurrentPage.value),
    },
  })
}

const formattedSavedAt = computed(() => {
  if (!noteSavedAt.value) return ''
  try { return new Date(noteSavedAt.value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
})

const resetHideTimer = () => {
  controlsVisible.value = true
  clearTimeout(hideControlsTimer)
  if (isExplaining.value) {
    hideControlsTimer = setTimeout(() => { controlsVisible.value = false }, 3500)
  }
}

watch(() => explainStatus.value, (s) => {
  if (s === 'explaining') { runVoiceProgress(); resetHideTimer() }
  else { clearVoiceTimer(); controlsVisible.value = true; clearTimeout(hideControlsTimer); scheduleLearningProgressReport() }
})
watch(() => `${currentLessonId.value}:${safeCurrentPage.value}`, () => {
  previewImageFailed.value = false
  previewImageVersion.value += 1
})
watch(() => `${currentLessonId.value}:${lessonInfo.value.currentSectionId}:${progressReportBucket.value}`, () => {
  scheduleLearningProgressReport()
})
watch(() => route.query, () => { syncContext(); loadNote(); loadPreviewMeta() }, { deep: true })
watch(() => noteText.value, persistNote)
onMounted(() => { syncContext(); loadNote(); loadPreviewMeta(); scheduleLearningProgressReport() })
onBeforeUnmount(() => { clearVoiceTimer(); clearTimeout(hideControlsTimer); clearPreviewPollTimer(); clearTimeout(progressTrackTimer) })
</script>

<template>
  <div class="cockpit" @mousemove="resetHideTimer">

    <div class="stage-col">

      <!-- Top bar -->
      <div class="stage-topbar">
        <button class="topbar-back" @click="backToHome">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <div class="topbar-meta">
          <span class="topbar-course">{{ courseInfo.courseName }}</span>
          <span class="topbar-sep">/</span>
          <span class="topbar-lesson">{{ lessonInfo.lessonTitle || '课程预览' }}</span>
        </div>

        <div class="topbar-right">
          <div class="progress-ring-wrap" title="整体进度">
            <svg class="progress-ring" width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(148,163,184,0.35)" stroke-width="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round"
                :stroke-dasharray="`${(learningProgress.overallProgress || 0) * 0.879} 87.9`" stroke-dashoffset="21.975"
                style="transition:stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" />
            </svg>
            <span class="progress-ring-label">{{ Math.round(learningProgress.overallProgress || 0) }}%</span>
          </div>

          <div class="status-chip" :style="{ background: statusDisplay.bg, color: statusDisplay.color }">
            <span class="status-dot" :style="{ background: statusDisplay.dot }" />
            {{ statusDisplay.text }}
          </div>

          <button class="topbar-btn" :class="{ active: catalogOpen }" @click="catalogOpen = !catalogOpen"
            :title="catalogOpen ? '收起目录' : '展开目录'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span class="topbar-btn-label">{{ catalogOpen ? '收起' : '目录' }}</span>
          </button>
        </div>
      </div>

      <!-- Slide area -->
      <div class="slide-area">

        <!-- Catalog overlay -->
        <transition name="catalog-slide">
          <div v-if="catalogOpen" class="catalog-drawer">
            <div class="drawer-header">
              <span class="drawer-title">课程目录</span>
              <button class="drawer-close" @click="catalogOpen = false">×</button>
            </div>
            <div class="drawer-list">
              <button v-for="(item, i) in catalogItems" :key="item.id" class="drawer-item"
                :class="{ active: lessonInfo.currentSectionId === item.id }" @click="handleSectionChange(item.id)">
                <span class="drawer-num">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="drawer-text">
                  <span class="drawer-name">{{ item.title }}</span>
                  <span class="drawer-desc">{{ item.desc }}</span>
                </span>
                <svg v-if="lessonInfo.currentSectionId === item.id" class="drawer-check" width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          </div>
        </transition>
        <div v-if="catalogOpen" class="catalog-backdrop" @click="catalogOpen = false" />

        <!-- PPT frame -->
        <div class="ppt-frame">
          <div class="slide-inner">
            <div class="slide-page-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              {{ safeCurrentPage }} / {{ effectiveTotalPages }}
            </div>
            <div class="slide-content-wrap">
              <img v-if="currentPreviewImageUrl && !previewImageFailed" class="slide-preview-image"
                :src="currentPreviewImageUrl" :alt="`PPT 第 ${safeCurrentPage} 页`" @error="handlePreviewImageError">
              <div v-else class="slide-empty-state">
                {{ previewPlaceholderText }}
              </div>
            </div>

          </div>
        </div>

        <!-- Page flip arrows -->
        <button class="flip-btn flip-prev" :disabled="!canPrevPage" @click="goPrevPage">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button class="flip-btn flip-next" :disabled="!canNextPage" @click="goNextPage">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <!-- Controls bar -->
      <transition name="controls-fade">
        <div v-show="controlsVisible" class="controls-bar">
          <div class="ctrl-group">
            <button class="play-ctrl play" :disabled="isExplaining" @click="startExplain">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
            <button class="play-ctrl" :disabled="!isExplaining" @click="pauseExplain">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
            <button class="play-ctrl resume" :disabled="!canResume" @click="resumeExplain">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
                <line x1="19" y1="3" x2="19" y2="21" />
              </svg>
            </button>
            <div class="voice-vol">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </div>
          </div>

          <div class="ctrl-progress">
            <div class="ctrl-track">
              <div class="ctrl-fill" :class="{ animating: isExplaining }" :style="{ width: voiceProgress + '%' }" />
              <div class="ctrl-thumb" :style="{ left: voiceProgress + '%' }" />
            </div>
            <div class="ctrl-time">
              <span>{{ Math.round(voiceProgress) }}%</span>
              <span>100%</span>
            </div>
          </div>

          <div class="ctrl-right">
            <span class="ctrl-section">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              {{ currentSection?.title || '-' }}
            </span>

            <el-dropdown
              trigger="click"
              :disabled="switchingTeachingPace"
              @command="switchTeachingPace"
            >
              <button class="pace-btn" :disabled="switchingTeachingPace">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M12 3v6" />
                  <path d="M12 21v-2" />
                  <path d="M4.93 4.93l4.24 4.24" />
                  <path d="M19.07 19.07l-1.41-1.41" />
                  <path d="M3 12h2" />
                  <path d="M19 12h2" />
                  <path d="M4.93 19.07l4.24-4.24" />
                  <path d="M19.07 4.93l-1.41 1.41" />
                </svg>
                {{ switchingTeachingPace ? '切换中...' : `授课节奏 ${teachingPace}` }}
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="快">快</el-dropdown-item>
                  <el-dropdown-item command="中">中</el-dropdown-item>
                  <el-dropdown-item command="慢">慢</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <button class="practice-entry-btn" @click="goToPracticeGame">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z" />
                <path d="M9.5 12.5l1.7 1.7 3.3-4.2" />
              </svg>
              练习闯关
            </button>
            
            <div class="page-stepper">
              <button :disabled="!canPrevPage" @click="goPrevPage">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span>{{ safeCurrentPage }}</span>
              <button :disabled="!canNextPage" @click="goNextPage">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>


    <div class="sidebar">
      <div class="sidebar-tabs">
        <button class="stab" :class="{ active: activeRightTab === 'chat' }" @click="activeRightTab = 'chat'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          AI 助手
        </button>
        <button class="stab" :class="{ active: activeRightTab === 'notes' }" @click="activeRightTab = 'notes'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          笔记
          <span v-if="noteText" class="stab-dot" />
        </button>
        <div class="stab-line" :style="{ transform: `translateX(${activeRightTab === 'notes' ? '100%' : '0'})` }" />
      </div>

      <!-- Chat -->
      <div v-show="activeRightTab === 'chat'" class="sidebar-pane chat-pane">
        <div class="chat-identity">
          <div class="chat-orb">AI</div>
          <div>
            <p class="chat-name">AI 助手</p>
            <p class="chat-sub"><span class="online-dot" />可随时提问当前课程内容</p>
          </div>
        </div>
        <div class="chat-body">
          <ChatBox :course-id="platformContext.courseId || courseInfo.courseId" :user-id="platformContext.userId"
            :lesson-id="platformContext.lessonId || lessonInfo.lessonId"
            :current-section-id="lessonInfo.currentSectionId" :current-page="safeCurrentPage"
            :session-id="sessionInfo.sessionId"
            @after-answer="handleQaFinished" />
        </div>
      </div>

      <!-- Notes -->
      <div v-show="activeRightTab === 'notes'" class="sidebar-pane notes-pane">
        <div class="notes-toolbar">
          <div class="notes-meta">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span v-if="formattedSavedAt" class="saved-at">已保存 {{ formattedSavedAt }}</span>
            <span v-else class="unsaved">未保存</span>
          </div>
          <button class="clear-btn" @click="clearNote">清空</button>
        </div>

        <div v-if="quickReviewPoints.length" class="qp-section">
          <p class="qp-title">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            AI 建议
          </p>
          <div class="qp-grid">
            <button v-for="pt in quickReviewPoints" :key="pt" class="qp-pill" @click="appendQuickPoint(pt)">
              + {{ pt }}
            </button>
          </div>
        </div>

        <textarea v-model="noteText" class="notes-ta" placeholder="在这里记录重点内容&#10;&#10;支持 Markdown 格式" />

        <button class="save-btn" @click="saveNote">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          保存笔记
        </button>
      </div>
    </div>

    <transition name="toast-pop">
      <div v-if="showResumePrompt" class="resume-toast">
        <span class="t-emoji">问</span>
        <div class="t-body">
          <p class="t-title">问答已完成</p>
          <p class="t-sub">是否继续当前课程讲解？</p>
        </div>
        <button class="t-primary" @click="continueLecture">继续讲解</button>
        <button class="t-ghost" @click="keepQaMode">继续问答</button>
        <button class="t-x" @click="showResumePrompt = false">×</button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Noto+Serif+SC:wght@700&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.cockpit {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 336px;
  background: linear-gradient(135deg, #eef4fb 0%, #f6f9ff 58%, #f2f7ff 100%);
  font-family: 'Sora', sans-serif;
  overflow: hidden;
}

.stage-col {
  display: flex;
  flex-direction: column;
  background: #f8fbff;
  min-width: 0;
}

/* Top bar */
.stage-topbar {
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #d9e5f3;
  z-index: 20;
}

.topbar-back {
  all: unset;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: #eaf1fb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5b6f8c;
  transition: all 0.15s;
  flex-shrink: 0;
}

.topbar-back:hover {
  background: #dbe7f6;
  color: #1e3a5f;
}

.topbar-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.topbar-course {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #60a5fa;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-sep {
  color: #94a3b8;
  flex-shrink: 0;
}

.topbar-lesson {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* Progress ring */
.progress-ring-wrap {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.progress-ring-label {
  font-size: 9px;
  font-weight: 700;
  color: #3b82f6;
  position: relative;
  z-index: 1;
}

/* Status chip */
.status-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  animation: blink 2s ease-in-out infinite;
}

@keyframes blink {

  0%,
  100% {
    opacity: 1
  }

  50% {
    opacity: 0.3
  }
}

.topbar-btn {
  all: unset;
  cursor: pointer;
  height: 34px;
  padding: 0 10px;
  gap: 6px;
  border-radius: 9px;
  background: #edf3fb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7f99;
  transition: all 0.15s;
  white-space: nowrap;
}

.topbar-btn:hover {
  background: #dbe8f8;
  color: #325987;
}

.topbar-btn.active {
  background: #dcecff;
  color: #2563eb;
}

.topbar-btn-label {
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1;
}

/* Slide area */
.slide-area {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* Catalog drawer */
.catalog-drawer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 295px;
  z-index: 30;
  background: #ffffff;
  border-right: 1px solid #dbe6f2;
  display: flex;
  flex-direction: column;
  box-shadow: 18px 0 34px rgba(15, 23, 42, 0.12);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 13px;
  border-bottom: 1px solid #e6edf7;
  flex-shrink: 0;
}

.drawer-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #1e293b;
}

.drawer-close {
  all: unset;
  cursor: pointer;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #eef4fb;
  color: #64748b;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.drawer-close:hover {
  background: #dbe8f8;
  color: #1e3a5f;
}

.drawer-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.drawer-list::-webkit-scrollbar {
  width: 3px;
}

.drawer-list::-webkit-scrollbar-thumb {
  background: #d0ddec;
  border-radius: 3px;
}

.drawer-item {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 11px;
  width: 100%;
  transition: all 0.15s;
  margin-bottom: 3px;
}

.drawer-item:hover {
  background: #f2f7ff;
}

.drawer-item.active {
  background: #e8f1ff;
}

.drawer-num {
  font-size: 11px;
  font-weight: 700;
  color: #9caec4;
  min-width: 22px;
}

.drawer-item.active .drawer-num {
  color: #2563eb;
}

.drawer-check {
  margin-right: 4px;
  flex-shrink: 0;
}

.drawer-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.drawer-name {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-item.active .drawer-name {
  color: #1f3f68;
}

.drawer-desc {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.catalog-backdrop {
  position: absolute;
  inset: 0;
  z-index: 25;
  background: rgba(15, 23, 42, 0.12);
}

/* PPT frame */
.ppt-frame {
  width: calc(100% - 12px);
  height: calc(100% - 4px);
  max-width: 1320px;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #dae6f3;
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.1), 0 22px 54px rgba(15, 23, 42, 0.12);
  background-image:
    radial-gradient(ellipse at 50% 0%, rgba(37, 99, 235, 0.08) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 100%, rgba(8, 145, 178, 0.05) 0%, transparent 50%);
  position: relative;
}

.slide-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 28px;
  position: relative;
}

.slide-page-label {
  position: absolute;
  top: 16px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #8ca1b9;
}

.slide-content-wrap {
  width: 100%;
  max-width: 1120px;
  text-align: center;
  animation: contentIn 0.35s ease;
}

.slide-preview-image {
  display: block;
  width: 100%;
  max-width: 100%;
  max-height: calc(100vh - 150px);
  margin: 0 auto;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.14);
}

.slide-empty-state {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-size: 16px;
  line-height: 1.8;
  color: #64748b;
}

@keyframes contentIn {
  from {
    opacity: 0;
    transform: translateY(10px)
  }

  to {
    opacity: 1;
    transform: translateY(0)
  }
}

.slide-text {
  font-size: 17px;
  line-height: 2;
  color: #334155;
  font-weight: 400;
}

/* Flip arrows */
.flip-btn {
  all: unset;
  cursor: pointer;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 38px;
  height: 62px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid #d5e3f2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7790ad;
  transition: all 0.2s;
  z-index: 5;
}

.flip-btn:hover:not(:disabled) {
  background: #ffffff;
  color: #355f8f;
  border-color: #bcd3ea;
}

.flip-btn:disabled {
  opacity: 0.18;
  cursor: not-allowed;
}

.flip-prev {
  left: 12px;
}

.flip-next {
  right: 12px;
}

/* Controls bar */
.controls-bar {
  height: 64px;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(12px);
  border-top: 1px solid #dae6f4;
}

.ctrl-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.play-ctrl {
  all: unset;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f7694;
  transition: all 0.15s;
}

.play-ctrl:hover:not(:disabled) {
  color: #1d3f67;
  background: #e8f0fa;
}

.play-ctrl:disabled {
  opacity: 0.22;
  cursor: not-allowed;
}

.play-ctrl.play {
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: #fff;
  width: 40px;
  height: 40px;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
}

.play-ctrl.play:not(:disabled):hover {
  box-shadow: 0 6px 24px rgba(37, 99, 235, 0.55);
  transform: scale(1.05);
}

.play-ctrl.play:disabled {
  opacity: 0.38;
  transform: none;
  box-shadow: none;
}

.voice-vol {
  color: #8ca1b8;
  display: flex;
  align-items: center;
  margin-left: 4px;
}

.ctrl-progress {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ctrl-track {
  height: 4px;
  background: #d8e3f0;
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  transition: height 0.15s;
}

.ctrl-track:hover {
  height: 6px;
}

.ctrl-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #06b6d4);
  border-radius: 999px;
  transition: width 0.5s linear;
  position: relative;
}

.ctrl-fill.animating::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 30px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4));
  animation: shim 1.2s linear infinite;
}

@keyframes shim {
  from {
    opacity: 0
  }

  50% {
    opacity: 1
  }

  to {
    opacity: 0
  }
}

.ctrl-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 8px rgba(37, 99, 235, 0.6);
  opacity: 0;
  transition: opacity 0.15s;
}

.ctrl-track:hover .ctrl-thumb {
  opacity: 1;
}

.ctrl-time {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #8ca1b8;
  font-weight: 600;
}

.ctrl-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pace-btn {
  border: none;
  border-radius: 999px;
  padding: 0 14px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  background: #edf3fb;
  color: #46627f;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  transition: transform 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.pace-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #dfe9f7;
  color: #254a74;
}

.pace-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.practice-entry-btn {
  border: none;
  border-radius: 999px;
  padding: 0 14px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.26);
  transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
}

.practice-entry-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.34);
  filter: saturate(1.05);
}


.ctrl-section {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: #6d86a5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
}

.page-stepper {
  display: flex;
  align-items: center;
  background: #eaf1fa;
  border-radius: 8px;
  overflow: hidden;
}

.page-stepper button {
  all: unset;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #637d9c;
  transition: all 0.15s;
}

.page-stepper button:hover:not(:disabled) {
  color: #1f436d;
  background: #dce8f6;
}

.page-stepper button:disabled {
  opacity: 0.18;
  cursor: not-allowed;
}

.page-stepper span {
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
  color: #3f5d80;
  min-width: 28px;
  text-align: center;
}

.sidebar {
  display: flex;
  flex-direction: column;
  background: #f9fcff;
  border-left: 1px solid #dbe7f3;
  overflow: hidden;
}

.sidebar-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 52px;
  flex-shrink: 0;
  background: #eff5fc;
  border-bottom: 1px solid #dbe7f3;
  position: relative;
}

.stab {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: #8aa0b9;
  position: relative;
  z-index: 1;
  transition: color 0.2s;
}

.stab.active {
  color: #1f3f67;
}

.stab-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  position: absolute;
  top: 13px;
  right: calc(50% - 30px);
}

.stab-line {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 50%;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(90deg, #2563eb, #06b6d4);
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.sidebar-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Chat */
.chat-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 10px;
  flex-shrink: 0;
  border-bottom: 1px solid #e6edf7;
}

.chat-orb {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1e3a5f, #1e40af);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #93c5fd;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 0 16px rgba(37, 99, 235, 0.3);
}

.chat-name {
  font-size: 13px;
  font-weight: 700;
  color: #1e3a5f;
}

.chat-sub {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #90a4bc;
  margin-top: 2px;
}

.online-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 6px #34d399;
  animation: blink 2s infinite;
}

.chat-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 10px 12px 12px;
  border: 1px solid #d9e7f5;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

.chat-body :deep(.chat-card) {
  border: none !important;
  box-shadow: none !important;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent !important;
}

.chat-body :deep(.chat-card > .el-card__header) {
  display: none;
}

.chat-body :deep(.chat-card > .el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  background: transparent;
}

.chat-body :deep(.chat-list) {
  flex: 1;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  padding: 0 10px 0 10px;
  scrollbar-width: thin;
  scrollbar-color: #9ab8da #ecf3fb;
}

.chat-body :deep(.chat-list::-webkit-scrollbar) {
  width: 8px;
}

.chat-body :deep(.chat-list::-webkit-scrollbar-track) {
  background: #ecf3fb;
  border-radius: 999px;
}

.chat-body :deep(.chat-list::-webkit-scrollbar-thumb) {
  background: linear-gradient(180deg, #9cc4ed 0%, #7ea8d8 100%);
  border-radius: 999px;
  border: 1px solid #e3edf8;
}

.chat-body :deep(.chat-list::-webkit-scrollbar-thumb:hover) {
  background: linear-gradient(180deg, #82b3e6 0%, #668fc6 100%);
}

/* Notes */
.notes-pane {
  padding: 14px;
  gap: 11px;
  overflow-y: auto;
}

.notes-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.notes-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #8da2ba;
}

.saved-at {
  color: #34d399;
}

.unsaved {
  color: #a8bacd;
}

.clear-btn {
  all: unset;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: #7b92ae;
  background: #edf4fc;
  transition: all 0.15s;
}

.clear-btn:hover {
  background: rgba(220, 38, 38, 0.15);
  color: #f87171;
}

.qp-section {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.qp-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #90a4bc;
}

.qp-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.qp-pill {
  all: unset;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: #93c5fd;
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.2);
  transition: all 0.15s;
  white-space: nowrap;
}

.qp-pill:hover {
  background: rgba(96, 165, 250, 0.2);
}

.notes-ta {
  flex: 1;
  min-height: 200px;
  resize: none;
  background: #ffffff;
  border: 1px solid #d8e5f2;
  border-radius: 12px;
  padding: 12px 14px;
  font: 13px/1.85 'Sora', sans-serif;
  color: #334155;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}

.notes-ta:focus {
  border-color: #9ec3ea;
  background: #fdfefe;
}

.notes-ta::placeholder {
  color: #a5b8cc;
}

.save-btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 40px;
  border-radius: 11px;
  font-size: 13.5px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #059669, #0891b2);
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.28);
  transition: all 0.18s;
  flex-shrink: 0;
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 7px 22px rgba(5, 150, 105, 0.4);
}

.catalog-slide-enter-active {
  animation: drawIn 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.catalog-slide-leave-active {
  animation: drawOut 0.2s ease;
}

@keyframes drawIn {
  from {
    transform: translateX(-100%)
  }

  to {
    transform: translateX(0)
  }
}

@keyframes drawOut {
  from {
    transform: translateX(0)
  }

  to {
    transform: translateX(-100%)
  }
}

.controls-fade-enter-active {
  transition: opacity 0.3s, transform 0.3s;
}

.controls-fade-leave-active {
  transition: opacity 0.5s, transform 0.5s;
}

.controls-fade-enter-from,
.controls-fade-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* Toast */
.resume-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #cfdff0;
  border-radius: 16px;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.2);
  max-width: 460px;
  width: calc(100vw - 48px);
}

.t-emoji {
  font-size: 20px;
  flex-shrink: 0;
}

.t-body {
  flex: 1;
  min-width: 0;
}

.t-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #1f3f67;
}

.t-sub {
  font-size: 12px;
  color: #6f86a3;
  margin-top: 2px;
}

.t-primary {
  all: unset;
  cursor: pointer;
  padding: 7px 16px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  box-shadow: 0 3px 10px rgba(37, 99, 235, 0.35);
  white-space: nowrap;
  transition: all 0.15s;
}

.t-primary:hover {
  box-shadow: 0 5px 18px rgba(37, 99, 235, 0.5);
}

.t-ghost {
  all: unset;
  cursor: pointer;
  padding: 7px 16px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  color: #5f7694;
  background: #edf3fb;
  white-space: nowrap;
  transition: all 0.15s;
}

.t-ghost:hover {
  background: #dbe8f8;
  color: #1f436d;
}

.t-x {
  all: unset;
  cursor: pointer;
  color: #93a8c0;
  font-size: 13px;
  padding: 4px;
  flex-shrink: 0;
  transition: color 0.15s;
}

.t-x:hover {
  color: #526d8d;
}

.toast-pop-enter-active {
  animation: tPop 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.toast-pop-leave-active {
  animation: tPop 0.2s ease reverse;
}

@keyframes tPop {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(16px)
  }

  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0)
  }
}
</style>
