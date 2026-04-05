import { adjustLessonProgress, trackLessonProgress } from '@/mock/demoApi'

const normalizeString = (value, fallback = '') => {
  if (Array.isArray(value)) {
    return normalizeString(value[0], fallback)
  }
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export const trackProgress = (payload = {}) => trackLessonProgress({
  schoolId: normalizeString(payload.schoolId, 'sch10001'),
  userId: normalizeString(payload.userId),
  courseId: normalizeString(payload.courseId),
  lessonId: normalizeString(payload.lessonId),
  currentSectionId: normalizeString(payload.currentSectionId || payload.sectionId),
  progressPercent: Number(payload.progressPercent ?? 0),
  lastOperateTime: normalizeString(payload.lastOperateTime, new Date().toISOString().slice(0, 19).replace('T', ' ')),
  qaRecordId: normalizeString(payload.qaRecordId),
})

export const adjustProgress = async (payload = {}) => {
  const result = await adjustLessonProgress({
    userId: normalizeString(payload.userId),
    lessonId: normalizeString(payload.lessonId),
    currentSectionId: normalizeString(payload.currentSectionId || payload.sectionId),
    understandingLevel: normalizeString(payload.understandingLevel, 'partial'),
    action: normalizeString(payload.action),
    qaRecordId: normalizeString(payload.qaRecordId, 'qa-local'),
  })
  return result.adjustPlan || result
}
