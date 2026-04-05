<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { EditPen, Reading, RefreshRight, UploadFilled } from '@element-plus/icons-vue'
import { generateScript, getParseStatus, getScriptStatus, parseLesson, renderLessonPpt } from '@/api/lesson'
import { TASK_POLL_INTERVAL_MS, TASK_POLL_TIMEOUT_MS } from '@/utils/runtimeConfig'
import { DEFAULT_SCHOOL_ID } from '@/utils/signature'
import { useLessonStore } from '@/store/lessonStore'
import PageHeaderBar from '@/components/PageHeaderBar.vue'
import StateBlock from '@/components/StateBlock.vue'

const route = useRoute()
const router = useRouter()
const lessonStore = useLessonStore()

const uploadRef = ref(null)
const leftColRef = ref(null)
const uploadFile = ref(null)
const restoredFileName = ref('')
const parseResult = ref(null)
const scriptStructure = ref([])
const parseTaskId = ref('')
const scriptTaskId = ref('')
const parsing = ref(false)
const generating = ref(false)
const parseSuccess = ref(false)
const scriptGenerated = ref(false)
const parseError = ref('')
const generateError = ref('')
const activeResultTab = ref('structure')
const activeFlowStep = ref('upload')
const draftDirty = ref(false)
const snapshotAt = ref('')
const hasSnapshot = ref(false)
const courseNameInput = ref('')
const courseDescInput = ref('')
const courseTagInput = ref('')
const coverImageUrl = ref('')
const coverImageFile = ref(null)
const hydratingCourseMeta = ref(true)
const syncedResultPanelHeight = ref(0)
let leftColResizeObserver = null

const defaultQuery = Object.freeze({ schoolId: DEFAULT_SCHOOL_ID, courseId: '101', lessonId: '1', userId: '10001', role: 'teacher', token: 'mock-token' })
const normalizeQuery = (v, d = '') => (Array.isArray(v) ? v[0] || d : (typeof v === 'string' && v ? v : d))
const normalizeText = (value, fallback = '') => (typeof value === 'string' && value.trim() ? value.trim() : fallback)
const platformQuery = computed(() => ({
  schoolId: normalizeQuery(route.query.schoolId, defaultQuery.schoolId),
  courseId: normalizeQuery(route.query.courseId, defaultQuery.courseId),
  lessonId: normalizeQuery(route.query.lessonId, defaultQuery.lessonId),
  userId: normalizeQuery(route.query.userId, defaultQuery.userId),
  role: 'teacher',
  token: normalizeQuery(route.query.token, defaultQuery.token),
}))
const snapshotKey = computed(() => `teacher-workflow:${platformQuery.value.courseId}:${platformQuery.value.lessonId}`)
const courseName = computed(() => courseNameInput.value || lessonStore.courseInfo.courseName || '人工智能导论')
const fileName = computed(() => uploadFile.value?.name || restoredFileName.value || '')
const backendLessonId = computed(() => normalizeText(parseResult.value?.parseId, lessonStore.lessonInfo.lessonId || platformQuery.value.lessonId))
const hasUploadedFile = computed(() => Boolean(fileName.value))
const hasUnsavedWorkflow = computed(() => draftDirty.value && (hasUploadedFile.value || parseSuccess.value || scriptGenerated.value || Boolean(courseNameInput.value.trim()) || Boolean(courseDescInput.value.trim())))
const breadcrumbs = computed(() => [{ label: '首页', to: '/home' }, { label: '教师工作台', current: true }])
const statusText = computed(() => (scriptGenerated.value ? '脚本已生成' : parseSuccess.value ? '待预览发布' : hasUploadedFile.value ? '待解析' : '准备中'))
const statusType = computed(() => (scriptGenerated.value ? 'success' : parseSuccess.value ? 'warning' : 'info'))
const resultPanelStyle = computed(() => (
  syncedResultPanelHeight.value
    ? {
        height: `${syncedResultPanelHeight.value}px`,
        maxHeight: `${syncedResultPanelHeight.value}px`,
      }
    : {}
))

const flowSteps = computed(() => {
  const s1 = hasUploadedFile.value ? 'done' : activeFlowStep.value === 'upload' ? 'active' : 'idle'
  const s2 = parseSuccess.value ? 'done' : parsing.value || activeFlowStep.value === 'parse' ? 'active' : hasUploadedFile.value ? 'idle' : 'locked'
  const s3 = scriptGenerated.value ? 'done' : generating.value || activeFlowStep.value === 'script' ? 'active' : parseSuccess.value ? 'idle' : 'locked'
  return [
    { id: 'upload', title: '上传课件', desc: '支持 PPT / PDF 格式', icon: '📁', status: s1 },
    { id: 'parse', title: '解析课件', desc: '抽取知识结构与章节', icon: '🔍', status: s2 },
    { id: 'script', title: '生成脚本', desc: 'AI 自动生成讲解脚本', icon: '✨', status: s3 },
  ]
})

const syncStoreContext = () => {
  lessonStore.syncPlatformContext(platformQuery.value)
  if (hydratingCourseMeta.value) {
    courseNameInput.value = lessonStore.courseInfo.courseName || ''
    courseDescInput.value = lessonStore.courseInfo.courseDesc || ''
    hydratingCourseMeta.value = false
  }
  lessonStore.setCourseInfo({
    courseId: platformQuery.value.courseId,
    courseName: courseName.value,
    courseDesc: courseDescInput.value,
    teacherName: '张老师',
  })
}

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
const readErrorMessage = (error, fallback) => error?.response?.data?.msg || error?.message || fallback

const extractPageNumbers = (value) => {
  const matches = String(value || '').match(/\d+/g) || []
  return [...new Set(matches.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))]
}

const normalizeStructureTree = (structurePreview = {}) => ({
  chapters: (structurePreview.chapters || []).map((chapter, chapterIndex) => ({
    id: chapter.chapterId || `chapter-${chapterIndex + 1}`,
    label: chapter.chapterName || `章节 ${chapterIndex + 1}`,
    children: (chapter.subChapters || []).map((subChapter, subIndex) => ({
      id: subChapter.subChapterId || `chapter-${chapterIndex + 1}-sub-${subIndex + 1}`,
      label: subChapter.subChapterName || `小节 ${subIndex + 1}`,
    })),
  })),
})

const buildPreviewSections = (structurePreview = {}) => (structurePreview.chapters || []).map((chapter, chapterIndex) => {
  const relatedPages = [...new Set((chapter.subChapters || []).flatMap((item) => extractPageNumbers(item.pageRange)))]
  return {
    sectionId: chapter.chapterId || `chapter-${chapterIndex + 1}`,
    title: chapter.chapterName || `章节 ${chapterIndex + 1}`,
    keywords: (chapter.subChapters || []).map((item) => item.subChapterName).filter(Boolean).slice(0, 3),
    relatedPages: relatedPages.length ? relatedPages : [chapterIndex + 1],
  }
})

const buildPreviewSectionsFromTree = (treePreview = {}) => (treePreview.chapters || []).map((chapter, chapterIndex) => ({
  sectionId: chapter.id || `chapter-${chapterIndex + 1}`,
  title: chapter.label || `章节 ${chapterIndex + 1}`,
  keywords: (chapter.children || []).map((item) => item.label).filter(Boolean).slice(0, 3),
  relatedPages: [chapterIndex + 1],
}))

const normalizeScriptSections = (sections = []) => sections.map((item, index) => ({
  id: item.sectionId || item.id || `sec-${index + 1}`,
  sectionId: item.sectionId || item.id || `sec-${index + 1}`,
  sectionName: item.sectionName || item.title || `章节 ${index + 1}`,
  content: item.content || item.explainScript || '暂无内容',
  keyPoints: Array.isArray(item.keyPoints) ? item.keyPoints : Array.isArray(item.keywords) ? item.keywords : [],
}))

const buildLessonSectionsFromScript = (sections = []) => {
  const previewSectionMap = new Map((lessonStore.lessonInfo.sections || []).map((item) => [item.sectionId, item]))
  return sections.map((item, index) => {
    const previewSection = previewSectionMap.get(item.sectionId) || {}
    return {
      ...previewSection,
      sectionId: item.sectionId,
      title: item.sectionName,
      explainScript: item.content,
      keywords: item.keyPoints,
      relatedPages: Array.isArray(previewSection.relatedPages) && previewSection.relatedPages.length
        ? previewSection.relatedPages
        : [index + 1],
    }
  })
}

const applyParseResult = (result) => {
  parseTaskId.value = result.parseId
  parseResult.value = {
    ...result,
    rawStructurePreview: result.structurePreview,
    structurePreview: normalizeStructureTree(result.structurePreview),
  }
  lessonStore.setLessonInfo({
    lessonId: result.parseId || platformQuery.value.lessonId,
    lessonTitle: courseName.value || '课程讲解内容',
    fileName: result.fileInfo?.fileName || uploadFile.value?.name || restoredFileName.value,
    totalPages: result.fileInfo?.pageCount || 1,
    sections: buildPreviewSections(result.structurePreview),
    pageContents: [],
  })
  parseSuccess.value = true
  activeFlowStep.value = 'script'
  activeResultTab.value = 'structure'
  draftDirty.value = true
}

const tryRecoverParseTask = async (parseId) => {
  const targetParseId = normalizeText(parseId, parseTaskId.value)
  if (!targetParseId) {
    return false
  }

  const latestResult = await getParseStatus(targetParseId)
  if (latestResult?.taskStatus !== 'completed') {
    return false
  }

  applyParseResult(latestResult)
  return true
}

const pollTaskStatus = async ({
  loadStatus,
  getStatus,
  timeoutMs = TASK_POLL_TIMEOUT_MS,
  intervalMs = TASK_POLL_INTERVAL_MS,
  pendingStates = ['processing', 'pending'],
}) => {
  const deadline = Date.now() + timeoutMs
  let latestResult = null

  while (Date.now() < deadline) {
    latestResult = await loadStatus()
    const status = getStatus(latestResult)
    if (status === 'completed') {
      return latestResult
    }
    if (status === 'failed') {
      throw new Error(normalizeText(latestResult?.errorMessage, '任务执行失败'))
    }
    if (!pendingStates.includes(status)) {
      return latestResult
    }
    await sleep(intervalMs)
  }

  throw new Error('任务执行超时，请稍后刷新状态。')
}

const clearResultState = () => {
  parseResult.value = null
  scriptStructure.value = []
  parseTaskId.value = ''
  scriptTaskId.value = ''
  parseSuccess.value = false
  scriptGenerated.value = false
  parseError.value = ''
  generateError.value = ''
  activeResultTab.value = 'structure'
}

const persistSnapshot = () => {
  if (typeof window === 'undefined') return
  const shouldKeep =
    hasUploadedFile.value ||
    parseSuccess.value ||
    scriptGenerated.value ||
    scriptStructure.value.length > 0 ||
    Boolean(courseNameInput.value.trim()) ||
    Boolean(courseDescInput.value.trim())
  if (!shouldKeep) { localStorage.removeItem(snapshotKey.value); hasSnapshot.value = false; return }
  localStorage.setItem(snapshotKey.value, JSON.stringify({
    fileName: fileName.value,
    courseNameInput: courseNameInput.value,
    courseDescInput: courseDescInput.value,
    parseResult: parseResult.value,
    scriptStructure: scriptStructure.value,
    parseTaskId: parseTaskId.value,
    scriptTaskId: scriptTaskId.value,
    parseSuccess: parseSuccess.value,
    scriptGenerated: scriptGenerated.value,
    activeResultTab: activeResultTab.value,
    activeFlowStep: activeFlowStep.value,
    updatedAt: new Date().toISOString(),
  }))
  hasSnapshot.value = true
}

const restoreSnapshot = () => {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(snapshotKey.value)
  if (!raw) { hasSnapshot.value = false; return false }
  try {
    const payload = JSON.parse(raw)
    hydratingCourseMeta.value = true
    restoredFileName.value = payload.fileName || ''
    courseNameInput.value = payload.courseNameInput || courseNameInput.value || lessonStore.courseInfo.courseName || ''
    courseDescInput.value = payload.courseDescInput || courseDescInput.value || lessonStore.courseInfo.courseDesc || ''
    parseResult.value = payload.parseResult || null
    scriptStructure.value = Array.isArray(payload.scriptStructure) ? payload.scriptStructure : []
    parseTaskId.value = payload.parseTaskId || payload.parseResult?.parseId || ''
    scriptTaskId.value = payload.scriptTaskId || ''
    parseSuccess.value = Boolean(payload.parseSuccess)
    scriptGenerated.value = Boolean(payload.scriptGenerated)
    activeResultTab.value = payload.activeResultTab || 'structure'
    activeFlowStep.value = payload.activeFlowStep || 'upload'
    snapshotAt.value = payload.updatedAt || ''
    lessonStore.setCourseInfo({
      courseId: platformQuery.value.courseId,
      courseName: courseNameInput.value || lessonStore.courseInfo.courseName,
      courseDesc: courseDescInput.value,
      teacherName: '张老师',
    })
    const restoredSections = scriptStructure.value.length
      ? buildLessonSectionsFromScript(scriptStructure.value)
      : buildPreviewSections(payload.parseResult?.rawStructurePreview || payload.parseResult?.structurePreview || {})
    lessonStore.setLessonInfo({
      lessonId: normalizeText(parseTaskId.value, platformQuery.value.lessonId),
      lessonTitle: courseNameInput.value || lessonStore.lessonInfo.lessonTitle || '课程讲解内容',
      fileName: payload.parseResult?.fileInfo?.fileName || restoredFileName.value,
      totalPages: payload.parseResult?.fileInfo?.pageCount || 1,
      sections: restoredSections.length ? restoredSections : buildPreviewSectionsFromTree(payload.parseResult?.structurePreview || {}),
      pageContents: [],
      scriptId: scriptTaskId.value,
    })
    hydratingCourseMeta.value = false
    hasSnapshot.value = true
    draftDirty.value = false
    return true
  } catch {
    hydratingCourseMeta.value = false
    localStorage.removeItem(snapshotKey.value)
    return false
  }
}

const clearSnapshot = () => {
  localStorage.removeItem(snapshotKey.value)
  hasSnapshot.value = false
  snapshotAt.value = ''
  ElMessage.success('已清空本地记录')
}

const restorePendingTaskState = async () => {
  if (parseSuccess.value || !parseTaskId.value) {
    return
  }

  try {
    const restored = await tryRecoverParseTask(parseTaskId.value)
    if (restored) {
      ElMessage.success('已同步后台解析结果')
    }
  } catch {
    // Ignore restore failures and let the user retry manually.
  }
}

const syncResultPanelHeight = () => {
  if (!leftColRef.value) {
    syncedResultPanelHeight.value = 0
    return
  }

  const nextHeight = Math.round(leftColRef.value.getBoundingClientRect().height)
  syncedResultPanelHeight.value = nextHeight > 0 ? nextHeight : 0
}

const onFileChange = (file) => { uploadFile.value = file.raw; restoredFileName.value = ''; clearResultState(); activeFlowStep.value = 'parse'; draftDirty.value = true }
const reuploadFile = () => { uploadFile.value = null; restoredFileName.value = ''; clearResultState(); uploadRef.value?.clearFiles(); draftDirty.value = true }
const onCoverImageChange = (file) => {
  const raw = file.raw
  if (!raw || !raw.type.startsWith('image/')) { ElMessage.warning('请上传图片文件'); return }
  coverImageFile.value = raw
  const reader = new FileReader()
  reader.onload = (e) => { coverImageUrl.value = e.target.result; draftDirty.value = true }
  reader.readAsDataURL(raw)
}
const removeCoverImage = () => { coverImageUrl.value = ''; coverImageFile.value = null; draftDirty.value = true }

const handleParse = async () => {
  if (!uploadFile.value) { ElMessage.warning('请先上传课件'); return }
  parsing.value = true
  parseError.value = ''
  parseSuccess.value = false
  scriptGenerated.value = false
  scriptStructure.value = []
  const formData = new FormData()
  formData.append('file', uploadFile.value)
  formData.append('schoolId', platformQuery.value.schoolId)
  formData.append('userId', platformQuery.value.userId)
  formData.append('courseId', platformQuery.value.courseId)
  formData.append('fileType', uploadFile.value.name.split('.').pop()?.toLowerCase() || 'pdf')
  let submittedParseId = ''
  try {
    const submission = await parseLesson(formData)
    submittedParseId = submission.parseId
    parseTaskId.value = submission.parseId
    const result = await pollTaskStatus({
      loadStatus: () => getParseStatus(submission.parseId),
      getStatus: (payload) => payload.taskStatus,
    })
    applyParseResult(result)
    ElMessage.success('解析完成')
  } catch (error) {
    try {
      const restored = await tryRecoverParseTask(submittedParseId || parseTaskId.value)
      if (restored) {
        parseError.value = ''
        ElMessage.success('解析已完成，已同步最新状态')
        return
      }
    } catch {
      // Ignore recovery errors and fall back to the original error message.
    }
    parseError.value = readErrorMessage(error, '解析失败，请重试。')
  } finally {
    parsing.value = false
  }
}

const handleGenerateScript = async () => {
  const currentParseId = normalizeText(parseTaskId.value, parseResult.value?.parseId || '')
  if (!parseSuccess.value || !currentParseId) { ElMessage.warning('请先完成解析'); return }
  generating.value = true
  generateError.value = ''
  scriptGenerated.value = false
  try {
    const submission = await generateScript({
      parseId: currentParseId,
      customOpening: courseDescInput.value,
    })
    scriptTaskId.value = submission.scriptId
    const result = await pollTaskStatus({
      loadStatus: () => getScriptStatus(submission.scriptId),
      getStatus: (payload) => payload.taskStatus,
    })
    scriptTaskId.value = result.scriptId
    scriptStructure.value = normalizeScriptSections(result.scriptStructure)
    lessonStore.setLessonInfo({
      lessonId: normalizeText(result.lessonId, backendLessonId.value),
      sections: buildLessonSectionsFromScript(scriptStructure.value),
      scriptId: result.scriptId,
      scriptGeneratedAt: new Date().toISOString(),
    })
    scriptGenerated.value = scriptStructure.value.length > 0
    activeResultTab.value = 'script'
    draftDirty.value = true
    ElMessage.success('脚本生成成功')
  } catch (error) {
    generateError.value = readErrorMessage(error, '脚本生成失败，请重试。')
  } finally {
    generating.value = false
  }
}

const goToScriptEditor = () => {
  if (!scriptGenerated.value) return
  draftDirty.value = false
  router.push({
    path: '/teacher/script-editor',
    query: {
      ...platformQuery.value,
      lessonId: backendLessonId.value,
      parseId: parseTaskId.value,
      scriptId: scriptTaskId.value,
    },
  })
}
const enterPreview = async () => {
  if (!scriptGenerated.value) return
  const lessonId = backendLessonId.value
  if (!lessonId) {
    ElMessage.error('未找到课件标识，无法进入预览')
    return
  }

  try {
    await renderLessonPpt(lessonId)
  } catch (error) {
    ElMessage.error(readErrorMessage(error, 'PPT 渲染失败，请稍后重试'))
    return
  }

  draftDirty.value = false
  router.push({
    path: '/lesson/player',
    query: {
      courseId: platformQuery.value.courseId,
      userId: platformQuery.value.userId,
      role: 'student',
      lessonId,
      token: platformQuery.value.token,
      schoolId: platformQuery.value.schoolId,
      scriptId: scriptTaskId.value,
    },
  })
}
const beforeUnload = (event) => { if (!hasUnsavedWorkflow.value) return; event.preventDefault(); event.returnValue = '' }

onMounted(async () => {
  syncStoreContext()
  if (restoreSnapshot()) ElMessage.success('已恢复上次流程')
  await restorePendingTaskState()
  await nextTick()
  syncResultPanelHeight()
  if (typeof ResizeObserver !== 'undefined' && leftColRef.value) {
    leftColResizeObserver = new ResizeObserver(() => syncResultPanelHeight())
    leftColResizeObserver.observe(leftColRef.value)
  }
  window.addEventListener('resize', syncResultPanelHeight)
  window.addEventListener('beforeunload', beforeUnload)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', syncResultPanelHeight)
  window.removeEventListener('beforeunload', beforeUnload)
  leftColResizeObserver?.disconnect()
  leftColResizeObserver = null
})
onBeforeRouteLeave((to, from, next) => next(!hasUnsavedWorkflow.value || window.confirm('有未保存流程，确认离开吗？')))
watch(() => route.query, syncStoreContext, { deep: true })
watch(() => activeFlowStep.value, () => nextTick(syncResultPanelHeight))
watch(
  () => [courseNameInput.value, courseDescInput.value],
  ([nextName, nextDesc], [prevName, prevDesc]) => {
    if (hydratingCourseMeta.value) return
    lessonStore.setCourseInfo({
      courseId: platformQuery.value.courseId,
      courseName: nextName || '人工智能导论',
      courseDesc: nextDesc,
      teacherName: '张老师',
    })
    if (nextName !== prevName || nextDesc !== prevDesc) draftDirty.value = true
  },
)
watch(() => [parseResult.value, scriptStructure.value, parseTaskId.value, scriptTaskId.value, parseSuccess.value, scriptGenerated.value, activeResultTab.value, activeFlowStep.value, fileName.value, courseNameInput.value, courseDescInput.value], persistSnapshot, { deep: true })
watch(() => [parsing.value, generating.value, parseSuccess.value, scriptGenerated.value, fileName.value], () => nextTick(syncResultPanelHeight))

const stepStatusMeta = {
  done: { label: '已完成', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  active: { label: '进行中', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  idle: { label: '待执行', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  locked: { label: '未解锁', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
}
const getStepMeta = (status) => stepStatusMeta[status] || stepStatusMeta.idle
</script>

<template>
  <div class="teacher-page">

    <!-- ── Top Header ──────────────────────────────────────── -->
    <header class="top-header">
      <div class="header-left">
        <button class="back-btn" @click="router.push('/home')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          返回首页
        </button>
        <div class="header-divider" />
        <div class="header-info">
          <p class="header-eyebrow">{{ courseName }}</p>
          <h1 class="header-title">课件解析 · 脚本生成</h1>
        </div>
      </div>

      <div class="header-right">
        <!-- 完成进度 -->
        <div class="progress-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {{flowSteps.filter(s => s.status === 'done').length}} / 3 步完成
        </div>

        <!-- 状态 pill -->
        <div class="status-pill" :class="`status-${statusType}`">
          <span class="status-dot" />{{ statusText }}
        </div>

        <!-- 草稿操作 -->
        <template v-if="hasSnapshot">
          <button class="hdr-btn" @click="restoreSnapshot">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.56" />
            </svg>
            恢复草稿
          </button>
          <button class="hdr-btn danger" @click="clearSnapshot">清空记录</button>
        </template>

        <div class="nav-logo">✨ 智课</div>
      </div>
    </header>

    <!-- draft tip -->
    <p v-if="snapshotAt" class="draft-tip">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      草稿保存于 {{ snapshotAt }}
    </p>

    <section class="course-meta-panel">
      <!-- 封面图上传 -->
      <div class="meta-cover-col">
        <p class="meta-label">课程封面</p>
        <div class="cover-upload-wrap">
          <el-upload v-if="!coverImageUrl" class="cover-uploader" :auto-upload="false" :show-file-list="false"
            accept="image/*" :on-change="onCoverImageChange">
            <div class="cover-placeholder">
              <div class="cover-ph-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <span class="cover-ph-text">点击上传封面</span>
              <span class="cover-ph-sub">JPG / PNG · 建议 16:9</span>
            </div>
          </el-upload>
          <div v-else class="cover-preview">
            <img :src="coverImageUrl" alt="课程封面" class="cover-preview-img" />
            <div class="cover-preview-overlay">
              <button class="cover-remove-btn" @click="removeCoverImage">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                更换图片
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 文字信息区 -->
      <div class="meta-fields-col">
        <!-- 课程名称 -->
        <div class="meta-field">
          <label class="meta-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            课程名称
            <span class="meta-required">*</span>
          </label>
          <el-input v-model="courseNameInput" maxlength="40" clearable show-word-limit placeholder="请输入课程名称，例如：人工智能导论"
            class="meta-input-styled" />
        </div>

        <!-- 标签 -->
        <div class="meta-field">
          <label class="meta-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            课程标签
          </label>
          <el-input v-model="courseTagInput" maxlength="20" clearable placeholder="例如：AI · 入门"
            class="meta-input-styled">
            <template #prefix>
              <span class="tag-prefix">#</span>
            </template>
          </el-input>
          <div class="tag-presets">
            <button v-for="preset in ['AI · 入门', 'ML · 进阶', 'CS · 核心', 'Python · 基础', '数学 · 自学']" :key="preset"
              class="tag-preset-btn" :class="{ active: courseTagInput === preset }" @click="courseTagInput = preset">{{
                preset }}</button>
          </div>
        </div>

        <!-- 课程简介 -->
        <div class="meta-field">
          <label class="meta-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="17" y1="10" x2="3" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="17" y1="18" x2="3" y2="18" />
            </svg>
            课程简介
          </label>
          <el-input v-model="courseDescInput" type="textarea" :rows="3" maxlength="240" resize="none" show-word-limit
            placeholder="简要描述课程目标与内容，将作为 AI 生成脚本的开场引导" class="meta-textarea-styled" />
        </div>
      </div>
    </section>

    <!-- ── Main content ────────────────────────────────────── -->
    <div class="main-grid">

      <!-- LEFT: Flow steps ─────────────────────────────────── -->
      <aside ref="leftColRef" class="left-col">

        <!-- Step cards -->
        <div class="steps-list">
          <button v-for="(step, i) in flowSteps" :key="step.id" class="step-card"
            :class="[`is-${step.status}`, { 'is-selected': activeFlowStep === step.id }]"
            :disabled="step.status === 'locked'" @click="step.status !== 'locked' && (activeFlowStep = step.id)">
            <div class="step-left">
              <div class="step-num"
                :style="{ background: getStepMeta(step.status).bg, color: getStepMeta(step.status).color, borderColor: getStepMeta(step.status).border }">
                <svg v-if="step.status === 'done'" width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span v-else>{{ i + 1 }}</span>
              </div>
              <div class="step-text">
                <span class="step-title">{{ step.title }}</span>
                <span class="step-desc">{{ step.desc }}</span>
              </div>
            </div>
            <span class="step-status-tag"
              :style="{ color: getStepMeta(step.status).color, background: getStepMeta(step.status).bg }">
              {{ getStepMeta(step.status).label }}
            </span>
          </button>
        </div>

        <!-- Active step panel ────────────────────────────── -->
        <div class="action-panel">

          <!-- Upload step -->
          <template v-if="activeFlowStep === 'upload'">
            <div class="action-panel-header">
              <span class="action-title">上传课件文件</span>
              <span class="action-desc">支持 .ppt .pptx .pdf</span>
            </div>
            <el-upload v-if="!hasUploadedFile" ref="uploadRef" class="custom-upload" drag :auto-upload="false"
              :show-file-list="false" accept=".ppt,.pptx,.pdf" :on-change="onFileChange">
              <div class="upload-inner">
                <div class="upload-icon-wrap">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p class="upload-main-text">拖拽文件到此，或 <span class="upload-link">点击上传</span></p>
                <p class="upload-sub-text">PPT / PPTX / PDF · 最大 100MB</p>
              </div>
            </el-upload>
            <div v-else class="file-card">
              <div class="file-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <span class="file-name">{{ fileName }}</span>
              <button class="file-reupload" @click="reuploadFile">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-3.56" />
                </svg>
                重新上传
              </button>
            </div>
          </template>

          <!-- Parse step -->
          <template v-else-if="activeFlowStep === 'parse'">
            <div class="action-panel-header">
              <span class="action-title">解析课件结构</span>
              <span class="action-desc">AI 将自动识别章节与知识点</span>
            </div>
            <div class="state-row" :class="parseSuccess ? 'state-success' : 'state-info'">
              <svg v-if="parseSuccess" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {{ parseSuccess ? '解析已完成' : '等待开始解析' }}
            </div>
            <button class="action-btn primary" :class="{ loading: parsing }" :disabled="!uploadFile || generating"
              @click="handleParse">
              <span v-if="parsing" class="btn-spinner" />
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {{ parsing ? '解析中...' : '开始解析' }}
            </button>
          </template>

          <!-- Script step -->
          <template v-else>
            <div class="action-panel-header">
              <span class="action-title">AI 生成讲解脚本</span>
              <span class="action-desc">基于解析结构智能生成逐章讲稿</span>
            </div>
            <div class="state-row" :class="scriptGenerated ? 'state-success' : 'state-info'">
              <svg v-if="scriptGenerated" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              {{ scriptGenerated ? '脚本已生成' : '待生成讲解脚本' }}
            </div>
            <button class="action-btn success" :class="{ loading: generating }" :disabled="!parseSuccess || parsing"
              @click="handleGenerateScript">
              <span v-if="generating" class="btn-spinner" />
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {{ generating ? '生成中...' : '生成脚本' }}
            </button>
          </template>
        </div>

        <!-- Bottom actions -->
        <div class="bottom-actions">
          <button class="action-btn outline" :disabled="!scriptGenerated" @click="goToScriptEditor">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            编辑脚本
          </button>
          <button class="action-btn primary" :disabled="!scriptGenerated" @click="enterPreview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            进入预览
          </button>
        </div>
      </aside>

      <!-- RIGHT: Result panel ──────────────────────────────── -->
      <section class="right-col">
        <div class="result-panel" :style="resultPanelStyle">
          <!-- Tab header -->
          <div class="result-tabs">
            <button class="result-tab" :class="{ active: activeResultTab === 'structure' }"
              @click="activeResultTab = 'structure'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z" />
              </svg>
              知识结构
            </button>
            <button class="result-tab" :class="{ active: activeResultTab === 'script' }"
              @click="activeResultTab = 'script'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              讲解脚本
            </button>
            <div class="tab-indicator"
              :style="{ transform: `translateX(${activeResultTab === 'script' ? '100%' : '0'})` }" />
          </div>

          <!-- Tab content -->
          <div class="result-content">

            <!-- Structure tab -->
            <template v-if="activeResultTab === 'structure'">
              <StateBlock v-if="parsing" mode="loading" title="解析中" description="正在抽取章节结构" />
              <StateBlock v-else-if="parseError" mode="error" title="解析失败" :description="parseError" action-text="重试"
                @action="handleParse" />
              <el-tree v-else-if="parseResult?.structurePreview?.chapters?.length" class="custom-tree"
                :data="parseResult.structurePreview.chapters" node-key="id" default-expand-all
                :props="{ label: 'label', children: 'children' }" />
              <div v-else class="empty-state">
                <div class="empty-icon">🗂</div>
                <p class="empty-title">暂无结构数据</p>
                <p class="empty-desc">上传并解析课件后，知识结构将展示在这里</p>
              </div>
            </template>

            <!-- Script tab -->
            <template v-else>
              <StateBlock v-if="generating" mode="loading" title="生成中" description="正在生成讲解脚本" />
              <StateBlock v-else-if="generateError" mode="error" title="生成失败" :description="generateError"
                action-text="重试" @action="handleGenerateScript" />
              <div v-else-if="scriptStructure.length" class="script-list">
                <details v-for="item in scriptStructure" :key="item.id" class="script-item">
                  <summary class="script-summary">
                    <span class="script-chevron">▸</span>
                    <span class="script-name">{{ item.sectionName }}</span>
                    <span v-if="item.keyPoints?.length" class="script-kp-count">{{ item.keyPoints.length }}
                      个要点</span>
                  </summary>
                  <div class="script-body">
                    <p class="script-content">{{ item.content }}</p>
                    <div v-if="item.keyPoints?.length" class="key-points">
                      <p class="kp-label">关键要点</p>
                      <ul class="kp-list">
                        <li v-for="point in item.keyPoints" :key="point">{{ point }}</li>
                      </ul>
                    </div>
                  </div>
                </details>
              </div>
              <div v-else class="empty-state">
                <div class="empty-icon">📝</div>
                <p class="empty-title">暂无脚本数据</p>
                <p class="empty-desc">完成课件解析后，点击「生成脚本」即可</p>
              </div>
            </template>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Noto+Serif+SC:wght@600;700&display=swap');

/* ── Base ─────────────────────────────────────────────────── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.teacher-page {
  min-height: 100vh;
  background: #f0f4fa;
  font-family: 'Sora', sans-serif;
  display: flex;
  flex-direction: column;
}

/* ── Top Header ──────────────────────────────────────────── */
.top-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  height: 64px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.back-btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  transition: all 0.15s;
  flex-shrink: 0;
  white-space: nowrap;
}

.back-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.header-divider {
  width: 1px;
  height: 28px;
  background: #e2e8f0;
  flex-shrink: 0;
}

.header-info {
  min-width: 0;
}

.header-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #2563eb;
  text-transform: uppercase;
  margin-bottom: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.progress-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-pill.status-success {
  background: #ecfdf5;
  color: #059669;
}

.status-pill.status-warning {
  background: #fffbeb;
  color: #d97706;
}

.status-pill.status-info {
  background: #f1f5f9;
  color: #64748b;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  animation: dotPulse 2s ease-in-out infinite;
}

@keyframes dotPulse {

  0%,
  100% {
    opacity: 1
  }

  50% {
    opacity: 0.3
  }
}

.hdr-btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 13px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  transition: all 0.15s;
}

.hdr-btn:hover {
  background: #e2e8f0;
}

.hdr-btn.danger {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}

.hdr-btn.danger:hover {
  background: #fee2e2;
}

.nav-logo {
  font-size: 16px;
  font-weight: 800;
  color: #1e3a5f;
  letter-spacing: -0.02em;
}

/* ── Draft tip ──────────────────────────────────────────── */
.draft-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 24px;
  font-size: 11.5px;
  color: #94a3b8;
  font-weight: 500;
  background: #fafbff;
  border-bottom: 1px solid #f1f5f9;
}

.course-meta-panel {
  margin: 16px 24px 0;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 20px 28px;
  border-radius: 18px;
  border: 1px solid #dce8f6;
  background: #fff;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
  align-items: start;
}

/* Cover column */
.meta-cover-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cover-upload-wrap {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 12px;
  overflow: hidden;
}

.cover-uploader {
  width: 100%;
  height: 100%;
}

.cover-uploader :deep(.el-upload) {
  width: 100%;
  height: 100%;
  display: block;
}

.cover-uploader :deep(.el-upload-dragger) {
  width: 100%;
  height: 100%;
  border: 2px dashed #bfdbfe;
  background: #f8fbff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
}

.cover-uploader :deep(.el-upload-dragger:hover) {
  border-color: #60a5fa;
  background: #eff6ff;
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.cover-ph-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #dbeafe;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-ph-text {
  font-size: 12.5px;
  font-weight: 600;
  color: #2563eb;
}

.cover-ph-sub {
  font-size: 11px;
  color: #94a3b8;
}

.cover-preview {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

.cover-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 10px;
  transition: background 0.2s;
}

.cover-preview:hover .cover-preview-overlay {
  background: rgba(15, 23, 42, 0.45);
}

.cover-remove-btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  opacity: 0;
  transition: opacity 0.2s;
  backdrop-filter: blur(6px);
}

.cover-preview:hover .cover-remove-btn {
  opacity: 1;
}

/* Fields column */
.meta-fields-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.meta-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.meta-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.02em;
}

.meta-required {
  color: #ef4444;
  font-size: 13px;
  line-height: 1;
}

/* Tag presets */
.tag-prefix {
  color: #60a5fa;
  font-weight: 700;
  font-size: 14px;
}

.tag-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-preset-btn {
  all: unset;
  cursor: pointer;
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  transition: all 0.15s;
  white-space: nowrap;
}

.tag-preset-btn:hover {
  background: #dbeafe;
  color: #2563eb;
  border-color: #bfdbfe;
}

.tag-preset-btn.active {
  background: #dbeafe;
  color: #2563eb;
  border-color: #93c5fd;
  font-weight: 600;
}

/* Input styles */
.meta-input-styled :deep(.el-input__wrapper),
.meta-textarea-styled :deep(.el-textarea__inner) {
  border-radius: 10px;
  box-shadow: 0 0 0 1.5px #dbe3ef inset;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  transition: box-shadow 0.2s;
}

.meta-input-styled :deep(.el-input__wrapper:hover),
.meta-textarea-styled :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1.5px #93c5fd inset;
}

.meta-input-styled :deep(.el-input__wrapper.is-focus),
.meta-textarea-styled :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 2px #3b82f6 inset;
}

.meta-input-styled :deep(.el-input__count),
.meta-textarea-styled :deep(.el-input__count),
.meta-textarea-styled :deep(.el-input__count-inner) {
  background: transparent;
  font-size: 11px;
}

/* ── Main grid ───────────────────────────────────────────── */
.main-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  padding: 20px 24px 28px;
  align-items: start;
}

/* ── Left column ─────────────────────────────────────────── */
.left-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 80px;
}

/* Steps list */
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-card {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
}

.step-card:hover:not(:disabled) {
  transform: translateX(2px);
  border-color: #bfdbfe;
}

.step-card.is-selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08), 0 2px 8px rgba(37, 99, 235, 0.12);
}

.step-card.is-done {
  border-color: #a7f3d0;
}

.step-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.step-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.2s;
}

.step-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
}

.step-desc {
  font-size: 11.5px;
  color: #94a3b8;
}

.step-status-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}

/* Action panel */
.action-panel {
  background: #fff;
  border-radius: 16px;
  border: 1.5px solid #e2e8f0;
  padding: 18px 16px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: panelIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes panelIn {
  from {
    opacity: 0;
    transform: translateY(6px)
  }

  to {
    opacity: 1;
    transform: translateY(0)
  }
}

.action-panel-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.action-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.action-desc {
  font-size: 12px;
  color: #94a3b8;
}

/* Upload area */
.custom-upload {
  width: 100%;
}

:deep(.custom-upload .el-upload) {
  width: 100%;
}

:deep(.custom-upload .el-upload-dragger) {
  width: 100%;
  height: auto;
  padding: 28px 20px;
  border: 1.5px dashed #bfdbfe;
  border-radius: 12px;
  background: #f8fbff;
  transition: all 0.2s;
}

:deep(.custom-upload .el-upload-dragger:hover) {
  border-color: #2563eb;
  background: #eff6ff;
}

.upload-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.upload-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-main-text {
  font-size: 13.5px;
  font-weight: 600;
  color: #334155;
}

.upload-link {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
}

.upload-sub-text {
  font-size: 11.5px;
  color: #94a3b8;
}

/* File card */
.file-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 11px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
}

.file-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-reupload {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
  transition: all 0.15s;
}

.file-reupload:hover {
  background: #e2e8f0;
}

/* State row */
.state-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
}

.state-row.state-success {
  background: #ecfdf5;
  color: #059669;
}

.state-row.state-info {
  background: #f1f5f9;
  color: #64748b;
}

/* Buttons */
.action-btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  height: 42px;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.18s;
  position: relative;
  overflow: hidden;
}

.action-btn.primary {
  background: linear-gradient(135deg, #1d4ed8, #0891b2);
  color: #fff;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
}

.action-btn.primary:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
}

.action-btn.success {
  background: linear-gradient(135deg, #059669, #0891b2);
  color: #fff;
  box-shadow: 0 4px 16px rgba(5, 150, 105, 0.28);
}

.action-btn.success:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(5, 150, 105, 0.38);
}

.action-btn.outline {
  background: #f8fafc;
  color: #475569;
  border: 1.5px solid #e2e8f0;
}

.action-btn.outline:not(:disabled):hover {
  background: #e2e8f0;
  color: #1e293b;
}

.action-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Bottom actions */
.bottom-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.right-col {
  min-width: 0;
}

.result-panel {
  background: #fff;
  border-radius: 18px;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Tabs */
.result-tabs {
  display: flex;
  position: relative;
  border-bottom: 1px solid #f1f5f9;
  padding: 0 8px;
  background: #fafbff;
}

.result-tab {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 14px 18px;
  font-size: 13.5px;
  font-weight: 600;
  color: #94a3b8;
  position: relative;
  z-index: 1;
  transition: color 0.2s;
}

.result-tab.active {
  color: #2563eb;
}

.result-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2.5px;
  background: #2563eb;
  border-radius: 2px 2px 0 0;
}

.result-tab svg {
  opacity: 0.6;
}

.result-tab.active svg {
  opacity: 1;
}

/* Content area */
.result-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  min-height: 0;
  overscroll-behavior: contain;
}

/* Tree */
:deep(.custom-tree) {
  background: transparent;
}

:deep(.custom-tree .el-tree-node__content) {
  height: 36px;
  border-radius: 8px;
  padding: 0 8px;
  transition: background 0.15s;
}

:deep(.custom-tree .el-tree-node__content:hover) {
  background: #f1f5f9;
}

:deep(.custom-tree .el-tree-node__label) {
  font-size: 13.5px;
  color: #334155;
  font-weight: 500;
}

/* Script list */
.script-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.script-item {
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  overflow: hidden;
  transition: border-color 0.2s;
}

.script-item[open] {
  border-color: #bfdbfe;
}

.script-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  cursor: pointer;
  list-style: none;
  background: #fafbff;
  user-select: none;
  transition: background 0.15s;
}

.script-summary:hover {
  background: #f1f5f9;
}

.script-summary::-webkit-details-marker {
  display: none;
}

.script-chevron {
  font-size: 16px;
  color: #94a3b8;
  transition: transform 0.2s;
  line-height: 1;
}

.script-item[open] .script-chevron {
  transform: rotate(90deg);
  color: #2563eb;
}

.script-name {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  flex: 1;
}

.script-kp-count {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
}

.script-body {
  padding: 14px 16px 16px;
  border-top: 1px solid #f1f5f9;
}

.script-content {
  font-size: 13.5px;
  line-height: 1.8;
  color: #334155;
  margin-bottom: 12px;
}

.key-points {
  margin-top: 4px;
}

.kp-label {
  font-size: 11.5px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.kp-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.kp-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
}

.kp-list li::before {
  content: '•';
  color: #2563eb;
  font-size: 10px;
  margin-top: 4px;
  flex-shrink: 0;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 40px;
}

.empty-title {
  font-size: 15px;
  font-weight: 700;
  color: #334155;
}

.empty-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  max-width: 260px;
}
</style>
