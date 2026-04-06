import { GENERATED_SMART_LESSON } from '@/mock/demoCourses'
import { mockCourseInfo, mockLessonMeta } from '@/mock/data'

const STORAGE_KEY = 'smart-class-demo-state-v1'
const KNOWLEDGE_BASE_KEY = 'smart-class-demo-kb-v1'
const FAKE_AI_DELAY_MS = 5000
const STAR_ORBIT_DEMO_QUESTION = '什么是双星问题'
const STAR_ORBIT_DEMO_ANSWER = '双星系统是指两颗恒星依靠两者之间的万有引力环绕着共同中心在各自圆轨道上稳定运行的恒星系统。双星系统由两颗相距较近的恒星组成，在相互之间的万有引力作用下，绕连线上的一点做周期相同的匀速圆周运动。'
const PARSE_TASK_DELAY_MS = 4800
const SCRIPT_TASK_DELAY_MS = 5600

const clone = (value) => {
  if (value === undefined) {
    return undefined
  }
  return JSON.parse(JSON.stringify(value))
}

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const readStorageJson = (key, fallback) => {
  if (!canUseStorage()) {
    return clone(fallback)
  }

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : clone(fallback)
  } catch {
    return clone(fallback)
  }
}

const writeStorageJson = (key, value) => {
  if (!canUseStorage()) {
    return
  }
  window.localStorage.setItem(key, JSON.stringify(value))
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const normalizeQuestionText = (value = '') => String(value).replace(/[？?。！!，,、\s]/g, '').trim()

const resolveDemoAnswer = (question = '') => {
  const normalizedQuestion = normalizeQuestionText(question)
  const normalizedPresetQuestion = normalizeQuestionText(STAR_ORBIT_DEMO_QUESTION)

  if (!normalizedQuestion || normalizedQuestion === normalizedPresetQuestion) {
    return STAR_ORBIT_DEMO_ANSWER
  }

  if (normalizedQuestion.includes('双星问题') || normalizedQuestion.includes('双星系统')) {
    return STAR_ORBIT_DEMO_ANSWER
  }

  return STAR_ORBIT_DEMO_ANSWER
}

const normalizeSectionPages = (pages = [], fallbackPage = 1) => {
  const normalized = [...new Set(
    pages
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0),
  )]
  return normalized.length ? normalized : [fallbackPage]
}

const normalizeSections = (sections = []) => sections.map((section, index) => ({
  sectionId: section.sectionId || `sec-${index + 1}`,
  title: section.title || `Section ${index + 1}`,
  relatedPages: normalizeSectionPages(section.relatedPages, index + 1),
  keywords: Array.isArray(section.keywords) ? section.keywords.filter(Boolean) : [],
  explainScript: section.explainScript || `This is the demo script for section ${index + 1}.`,
}))

const buildStructurePreview = (sections = []) => ({
  chapters: sections.map((section, index) => ({
    chapterId: section.sectionId || `chapter-${index + 1}`,
    chapterName: section.title || `Section ${index + 1}`,
    subChapters: [
      {
        subChapterId: `${section.sectionId || `chapter-${index + 1}`}-1`,
        subChapterName: `${section.title || `Section ${index + 1}`} Summary`,
        pageRange: `${section.relatedPages?.[0] || index + 1}-${section.relatedPages?.[section.relatedPages.length - 1] || index + 1}`,
      },
    ],
  })),
})

const buildScriptStructure = (sections = [], opening = '') => sections.map((section, index) => ({
  sectionId: section.sectionId || `sec-${index + 1}`,
  sectionName: section.title || `Section ${index + 1}`,
  content: index === 0 && opening
    ? `${opening}\n\n${section.explainScript || ''}`.trim()
    : (section.explainScript || `This is the demo script for section ${index + 1}.`),
  keyPoints: Array.isArray(section.keywords) ? section.keywords.filter(Boolean) : [],
}))

const isStarOrbitLesson = ({ lessonId = '', fileName = '', courseName = '' } = {}) => (
  String(lessonId) === GENERATED_SMART_LESSON.lessonId
  || String(fileName).includes('双星问题')
  || String(courseName).includes('星轨探微')
)

const buildDefaultLesson = (lessonId = mockLessonMeta.lessonId || 'lesson-demo-001', overrides = {}) => {
  if (isStarOrbitLesson({
    lessonId,
    fileName: overrides.fileName,
    courseName: overrides.lessonTitle,
  })) {
    const sections = normalizeSections(overrides.sections || GENERATED_SMART_LESSON.sections || [])

    return {
      lessonId: lessonId || GENERATED_SMART_LESSON.lessonId,
      courseId: overrides.courseId || GENERATED_SMART_LESSON.courseId,
      lessonTitle: overrides.lessonTitle || GENERATED_SMART_LESSON.lessonTitle,
      fileName: overrides.fileName || GENERATED_SMART_LESSON.fileName,
      totalPages: Number(overrides.totalPages || GENERATED_SMART_LESSON.totalPages || 13),
      sections,
      previewBasePath: overrides.previewBasePath || GENERATED_SMART_LESSON.previewBasePath,
      downloadUrl: overrides.downloadUrl || GENERATED_SMART_LESSON.downloadUrl,
      lastParseId: lessonId,
      lastScriptId: '',
      updatedAt: new Date().toISOString(),
    }
  }

  const sections = normalizeSections(overrides.sections || mockLessonMeta.sections || [])

  return {
    lessonId,
    courseId: overrides.courseId || mockCourseInfo.courseId || 'course-demo-001',
    lessonTitle: overrides.lessonTitle || mockLessonMeta.lessonTitle || 'Smart Class Demo Lesson',
    fileName: overrides.fileName || mockLessonMeta.fileName || 'demo-lesson.pdf',
    totalPages: Number(overrides.totalPages || mockLessonMeta.totalPages || 18),
    sections,
    lastParseId: lessonId,
    lastScriptId: '',
    updatedAt: new Date().toISOString(),
  }
}

const createInitialState = () => {
  const primaryLesson = buildDefaultLesson(mockLessonMeta.lessonId || 'lesson-demo-001')
  const playerLesson = buildDefaultLesson('1', {
    courseId: 'course-1',
    lessonTitle: primaryLesson.lessonTitle,
    fileName: primaryLesson.fileName,
    totalPages: primaryLesson.totalPages,
    sections: primaryLesson.sections,
  })

  return {
    lessons: {
      [primaryLesson.lessonId]: primaryLesson,
      [playerLesson.lessonId]: playerLesson,
    },
    parseTasks: {},
    scriptTasks: {},
  }
}

const getState = () => readStorageJson(STORAGE_KEY, createInitialState())
const saveState = (state) => writeStorageJson(STORAGE_KEY, state)

const ensureLesson = (lessonId = '', overrides = {}) => {
  const state = getState()
  const resolvedLessonId = String(lessonId || overrides.lessonId || mockLessonMeta.lessonId || 'lesson-demo-001')

  if (!state.lessons[resolvedLessonId]) {
    state.lessons[resolvedLessonId] = buildDefaultLesson(resolvedLessonId, overrides)
  } else if (Object.keys(overrides).length) {
    state.lessons[resolvedLessonId] = {
      ...state.lessons[resolvedLessonId],
      ...clone(overrides),
      lessonId: resolvedLessonId,
      sections: normalizeSections(overrides.sections || state.lessons[resolvedLessonId].sections || []),
      updatedAt: new Date().toISOString(),
    }
  }

  saveState(state)
  return clone(state.lessons[resolvedLessonId])
}

const resolveLessonByScriptId = (state, scriptId) => {
  const task = state.scriptTasks[scriptId]
  if (task?.lessonId && state.lessons[task.lessonId]) {
    return state.lessons[task.lessonId]
  }

  return Object.values(state.lessons).find((lesson) => lesson.lastScriptId === scriptId) || null
}

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const toDataUrl = (content, mimeType = 'text/plain;charset=utf-8') => (
  `data:${mimeType},${encodeURIComponent(content)}`
)

const createTaskMeta = (delayMs) => ({
  createdAt: Date.now(),
  readyAt: Date.now() + delayMs,
})

const getTaskProgress = (task) => {
  if (!task?.createdAt || !task?.readyAt || task.readyAt <= task.createdAt) {
    return 100
  }
  const ratio = (Date.now() - task.createdAt) / (task.readyAt - task.createdAt)
  return clamp(Math.round(ratio * 100), 0, 100)
}

const resolveTaskStatus = (task) => {
  if (!task) {
    return 'completed'
  }
  return Date.now() >= task.readyAt ? 'completed' : 'processing'
}

export const getHomeAssistantReply = async (question = '') => {
  await wait(FAKE_AI_DELAY_MS)
  return resolveDemoAnswer(question)
}

export const parseUploadedLesson = async (payload = {}) => {
  const fileName = payload.fileName || payload.file?.name || 'demo-lesson.pdf'
  const shouldUseStarOrbitLesson = isStarOrbitLesson({
    lessonId: payload.lessonId,
    fileName,
    courseName: payload.courseName,
  })
  const lessonId = String(payload.lessonId || (
    shouldUseStarOrbitLesson ? GENERATED_SMART_LESSON.lessonId : `lesson-demo-${Date.now()}`
  ))
  const lesson = buildDefaultLesson(lessonId, {
    courseId: payload.courseId || (shouldUseStarOrbitLesson ? GENERATED_SMART_LESSON.courseId : mockCourseInfo.courseId),
    lessonTitle: payload.courseName || fileName.replace(/\.[^.]+$/, '') || 'Demo Lesson',
    fileName,
  })
  const taskMeta = createTaskMeta(PARSE_TASK_DELAY_MS)

  const parseResult = {
    parseId: lessonId,
    taskStatus: 'processing',
    progressPercent: 0,
    stageText: '正在解析课件结构...',
    fileInfo: {
      fileName: lesson.fileName,
      pageCount: lesson.totalPages,
    },
    structurePreview: buildStructurePreview(lesson.sections),
    ...taskMeta,
  }

  const state = getState()
  state.lessons[lessonId] = {
    ...lesson,
    lastParseId: lessonId,
  }
  state.parseTasks[lessonId] = parseResult
  saveState(state)

  await wait(650)
  return { parseId: lessonId, taskStatus: 'processing' }
}

export const getParseTask = async (parseId = '') => {
  const state = getState()
  const resolvedParseId = String(parseId || mockLessonMeta.lessonId || 'lesson-demo-001')
  const task = state.parseTasks[resolvedParseId]

  if (task) {
    const nextStatus = resolveTaskStatus(task)
    const progressPercent = nextStatus === 'completed' ? 100 : Math.max(12, getTaskProgress(task))
    const response = {
      ...clone(task),
      taskStatus: nextStatus,
      progressPercent,
      stageText: nextStatus === 'completed' ? '课件解析完成' : '正在解析课件结构...',
    }

    if (nextStatus === 'completed') {
      state.parseTasks[resolvedParseId] = response
      saveState(state)
    }

    return response
  }

  const lesson = ensureLesson(resolvedParseId)
  return {
    parseId: resolvedParseId,
    taskStatus: 'completed',
    fileInfo: {
      fileName: lesson.fileName,
      pageCount: lesson.totalPages,
    },
    structurePreview: buildStructurePreview(lesson.sections),
  }
}

export const generateLessonScriptTask = async (payload = {}) => {
  const parseId = String(payload.parseId || mockLessonMeta.lessonId || 'lesson-demo-001')
  const lesson = ensureLesson(parseId)
  const scriptId = `script-${Date.now()}`
  const scriptStructure = buildScriptStructure(lesson.sections, payload.customOpening)
  const taskMeta = createTaskMeta(SCRIPT_TASK_DELAY_MS)

  const state = getState()
  state.scriptTasks[scriptId] = {
    scriptId,
    lessonId: lesson.lessonId,
    taskStatus: 'processing',
    progressPercent: 0,
    stageText: '正在生成讲解脚本...',
    scriptStructure,
    ...taskMeta,
  }
  state.lessons[lesson.lessonId] = {
    ...lesson,
    lastScriptId: scriptId,
    sections: lesson.sections.map((section, index) => ({
      ...section,
      explainScript: scriptStructure[index]?.content || section.explainScript,
      keywords: scriptStructure[index]?.keyPoints || section.keywords,
    })),
    updatedAt: new Date().toISOString(),
  }
  saveState(state)

  await wait(700)
  return { scriptId, taskStatus: 'processing' }
}

export const getScriptTask = async (scriptId = '') => {
  const state = getState()
  const resolvedScriptId = String(scriptId || '')
  const task = resolvedScriptId ? state.scriptTasks[resolvedScriptId] : null

  if (task) {
    const nextStatus = resolveTaskStatus(task)
    const progressPercent = nextStatus === 'completed' ? 100 : Math.max(10, getTaskProgress(task))
    const response = {
      ...clone(task),
      taskStatus: nextStatus,
      progressPercent,
      stageText: nextStatus === 'completed' ? '讲解脚本生成完成' : '正在生成讲解脚本...',
    }

    if (nextStatus === 'completed') {
      state.scriptTasks[resolvedScriptId] = response
      saveState(state)
    }

    return response
  }

  const lesson = ensureLesson(mockLessonMeta.lessonId || 'lesson-demo-001')
  return {
    scriptId: resolvedScriptId || lesson.lastScriptId || 'script-demo-default',
    lessonId: lesson.lessonId,
    taskStatus: 'completed',
    scriptStructure: buildScriptStructure(lesson.sections),
  }
}

export const updateLessonScriptTask = async (payload = {}) => {
  const state = getState()
  const scriptId = String(payload.scriptId || '')
  const scriptStructure = Array.isArray(payload.scriptStructure) ? clone(payload.scriptStructure) : []
  const lesson = resolveLessonByScriptId(state, scriptId) || ensureLesson(mockLessonMeta.lessonId || 'lesson-demo-001')

  const nextSections = scriptStructure.map((section, index) => {
    const previous = lesson.sections.find((item) => item.sectionId === section.sectionId) || lesson.sections[index] || {}
    return {
      ...previous,
      sectionId: section.sectionId || previous.sectionId || `sec-${index + 1}`,
      title: section.sectionName || previous.title || `Section ${index + 1}`,
      explainScript: section.content || previous.explainScript || '',
      keywords: Array.isArray(section.keyPoints) ? section.keyPoints.filter(Boolean) : (previous.keywords || []),
      relatedPages: normalizeSectionPages(previous.relatedPages, index + 1),
    }
  })

  state.lessons[lesson.lessonId] = {
    ...lesson,
    sections: nextSections,
    lastScriptId: scriptId || lesson.lastScriptId,
    updatedAt: new Date().toISOString(),
  }

  if (scriptId) {
    state.scriptTasks[scriptId] = {
      scriptId,
      lessonId: lesson.lessonId,
      taskStatus: 'completed',
      scriptStructure: buildScriptStructure(nextSections),
    }
  }

  saveState(state)

  return {
    success: true,
    scriptId: scriptId || lesson.lastScriptId,
  }
}

export const renderLessonPreview = async (lessonId = '') => {
  const resolvedLesson = ensureLesson(String(lessonId || mockLessonMeta.lessonId || 'lesson-demo-001'))
  return {
    lessonId: resolvedLesson.lessonId,
    taskStatus: 'completed',
  }
}

export const getLessonPreviewInfo = async (lessonId = '') => {
  const lesson = ensureLesson(String(lessonId || mockLessonMeta.lessonId || 'lesson-demo-001'))
  return {
    taskStatus: 'completed',
    slideCount: lesson.totalPages,
  }
}

export const getLessonPreviewUrl = (lessonId = '', slideNumber = 1, params = {}) => {
  const lesson = ensureLesson(String(lessonId || mockLessonMeta.lessonId || 'lesson-demo-001'))
  const page = clamp(Number(slideNumber || 1), 1, Number(lesson.totalPages || 1))
  const section = lesson.sections.find((item) => item.relatedPages.includes(page)) || lesson.sections[0]

  if (lesson.previewBasePath) {
    return `${lesson.previewBasePath}/${page}.png`
  }

  const paramSummary = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join(' · ')

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="55%" stop-color="#1d4ed8" />
      <stop offset="100%" stop-color="#0f766e" />
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)" rx="36" />
  <rect x="56" y="56" width="1488" height="788" rx="28" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
  <text x="96" y="150" fill="#93c5fd" font-size="28" font-family="Microsoft YaHei, PingFang SC, sans-serif">SMART CLASS DEMO</text>
  <text x="96" y="238" fill="#ffffff" font-size="56" font-weight="700" font-family="Microsoft YaHei, PingFang SC, sans-serif">${escapeXml(lesson.lessonTitle)}</text>
  <text x="96" y="324" fill="#dbeafe" font-size="34" font-family="Microsoft YaHei, PingFang SC, sans-serif">Page ${page} · ${escapeXml(section?.title || 'Lesson Content')}</text>
  <text x="96" y="406" fill="#bfdbfe" font-size="26" font-family="Microsoft YaHei, PingFang SC, sans-serif">${escapeXml((section?.keywords || []).join(' / ') || 'Preset demo content')}</text>
  <foreignObject x="96" y="470" width="1200" height="220">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Microsoft YaHei, PingFang SC, sans-serif; color: #eff6ff; font-size: 28px; line-height: 1.7;">
      ${escapeXml(section?.explainScript || 'Current slide preview is generated completely on the front end.')}
    </div>
  </foreignObject>
  <text x="96" y="780" fill="#7dd3fc" font-size="22" font-family="Microsoft YaHei, PingFang SC, sans-serif">${escapeXml(lesson.fileName)}</text>
  <text x="1504" y="810" text-anchor="end" fill="#cbd5e1" font-size="22" font-family="Microsoft YaHei, PingFang SC, sans-serif">${escapeXml(paramSummary || 'front-end demo')}</text>
</svg>`

  return toDataUrl(svg, 'image/svg+xml;charset=utf-8')
}

export const getLessonDownloadLink = (lessonId = '') => {
  const lesson = ensureLesson(String(lessonId || mockLessonMeta.lessonId || 'lesson-demo-001'))
  if (lesson.downloadUrl) {
    return lesson.downloadUrl
  }

  const content = [
    'Smart Class Demo Export',
    `Course: ${lesson.lessonTitle}`,
    `File: ${lesson.fileName}`,
    `Pages: ${lesson.totalPages}`,
    '',
    ...lesson.sections.map((section, index) => `${index + 1}. ${section.title}`),
  ].join('\n')

  return toDataUrl(content, 'text/plain;charset=utf-8')
}

export const trackLessonProgress = async (payload = {}) => {
  const lesson = ensureLesson(String(payload.lessonId || '1'))
  const totalProgress = clamp(Math.max(Number(payload.progressPercent || 0), 12), 0, 100)

  return {
    lessonId: lesson.lessonId,
    totalProgress,
    sectionId: payload.currentSectionId || lesson.sections[0]?.sectionId || '',
  }
}

export const adjustLessonProgress = async (payload = {}) => {
  const action = String(payload.action || '').trim()
  const configMap = {
    '继续当前章节': { pace: 'normal', progressDelta: 5, understandingLevel: '理解中等' },
    '补充讲解': { pace: 'slow', progressDelta: 3, understandingLevel: '需要巩固' },
    '加快节奏': { pace: 'fast', progressDelta: 8, understandingLevel: '理解良好' },
  }

  const config = configMap[action] || {
    pace: payload.understandingLevel || 'normal',
    progressDelta: 4,
    understandingLevel: '理解中等',
  }

  return {
    action: action || '继续当前章节',
    pace: config.pace,
    progressDelta: config.progressDelta,
    understandingLevel: config.understandingLevel,
    recommendedActions: ['继续当前章节', '补充讲解', '加快节奏'],
  }
}

export const askLessonQuestion = async (payload = {}) => {
  const lesson = ensureLesson(String(payload.lessonId || '1'))
  const currentSection = lesson.sections.find((item) => item.sectionId === payload.currentSectionId) || lesson.sections[0]
  const matchedPage = currentSection.relatedPages?.[0] || Number(payload.currentPage || 1) || 1
  const answerId = `answer-${Date.now()}`
  const question = String(payload.question || payload.questionContent || '').trim()

  await wait(FAKE_AI_DELAY_MS)

  return {
    answer: resolveDemoAnswer(question),
    relatedKnowledge: currentSection.keywords.length ? currentSection.keywords : ['双星系统', '万有引力', '圆周运动'],
    understandingLevel: '理解中等',
    suggestions: [
      STAR_ORBIT_DEMO_QUESTION,
      '双星系统有哪些基本特点？',
      '为什么两颗恒星会绕共同中心运动？',
    ],
    answerId,
    questionType: payload.questionType || 'text',
    nextAction: '继续当前章节',
    reason: '当前问答为前端预置演示答案，未接入真实模型或知识检索。',
    matchedSectionId: currentSection.sectionId,
    matchedPage,
    targetSectionId: currentSection.sectionId,
    targetPage: matchedPage,
  }
}

const defaultKnowledgeBases = [
  {
    kbId: 'kb-demo-001',
    kbName: 'Smart Class Demo KB',
    courseId: mockCourseInfo.courseId || 'course-demo-001',
    status: 'ready',
    chunkCount: 128,
    sourceCount: 1,
  },
  {
    kbId: 'kb-demo-002',
    kbName: 'Machine Learning Demo KB',
    courseId: 'course-ml-001',
    status: 'draft',
    chunkCount: 64,
    sourceCount: 1,
  },
]

export const listKnowledgeBases = async () => readStorageJson(KNOWLEDGE_BASE_KEY, defaultKnowledgeBases)

export const getKnowledgeBaseDetail = async (kbId = '') => {
  const kbList = await listKnowledgeBases()
  const detail = kbList.find((item) => item.kbId === kbId) || kbList[0] || defaultKnowledgeBases[0]
  return {
    ...detail,
    updatedAt: new Date().toISOString(),
    embeddingModel: 'demo-embedding-local',
    notes: 'This knowledge base is fake demo data stored in localStorage.',
  }
}

export const createKnowledgeBase = async (payload = {}) => {
  const kbList = await listKnowledgeBases()
  const nextItem = {
    kbId: `kb-demo-${Date.now()}`,
    kbName: payload.kbName || 'New Demo KB',
    courseId: payload.courseId || mockCourseInfo.courseId || 'course-demo-001',
    status: 'draft',
    chunkCount: 0,
    sourceCount: 0,
  }
  const nextList = [nextItem, ...kbList]
  writeStorageJson(KNOWLEDGE_BASE_KEY, nextList)
  return nextItem
}

export const addKnowledgeBaseSources = async (payload = {}) => ({
  success: true,
  kbId: payload.kbId || '',
  lessonIds: Array.isArray(payload.lessonIds) ? payload.lessonIds : [],
})

export const buildKnowledgeBaseIndex = async (payload = {}) => ({
  success: true,
  kbId: payload.kbId || '',
  taskStatus: 'completed',
})
