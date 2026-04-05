import {
  generateLessonScriptTask,
  getLessonDownloadLink,
  getLessonPreviewInfo,
  getLessonPreviewUrl,
  getParseTask,
  getScriptTask,
  parseUploadedLesson,
  renderLessonPreview,
  updateLessonScriptTask,
} from '@/mock/demoApi'

const normalizeString = (value, fallback = '') => {
  if (Array.isArray(value)) {
    return normalizeString(value[0], fallback)
  }
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export const parseLesson = async (payload = {}) => {
  if (typeof FormData !== 'undefined' && payload instanceof FormData) {
    return parseUploadedLesson({
      lessonId: normalizeString(payload.get('lessonId')),
      courseId: normalizeString(payload.get('courseId')),
      userId: normalizeString(payload.get('userId')),
      schoolId: normalizeString(payload.get('schoolId')),
      fileName: payload.get('file')?.name || '演示课件.pdf',
      file: payload.get('file'),
    })
  }

  return parseUploadedLesson({
    lessonId: normalizeString(payload.lessonId),
    courseId: normalizeString(payload.courseId),
    userId: normalizeString(payload.userId),
    schoolId: normalizeString(payload.schoolId),
    fileName: normalizeString(payload.fileName || payload.fileUrl, '演示课件.pdf'),
  })
}

export const getParseStatus = (parseId) => getParseTask(parseId)

export const generateScript = (payload = {}) => generateLessonScriptTask({
  parseId: normalizeString(payload.parseId),
  customOpening: normalizeString(payload.customOpening),
})

export const getScriptStatus = (scriptId) => getScriptTask(scriptId)

export const editScript = (payload = {}) => updateLessonScriptTask({
  scriptId: normalizeString(payload.scriptId),
  scriptStructure: Array.isArray(payload.scriptStructure) ? payload.scriptStructure : [],
})

export const renderLessonPpt = (lessonId) => renderLessonPreview(lessonId)

export const getLessonPreviewMeta = (lessonId) => getLessonPreviewInfo(lessonId)

export const buildLessonDownloadUrl = (lessonId) => getLessonDownloadLink(lessonId)

export const getLessonPreviewImageUrl = (lessonId, slideNumber, params = {}) => (
  getLessonPreviewUrl(lessonId, slideNumber, params)
)

export const buildLessonPreviewImageUrl = getLessonPreviewImageUrl
