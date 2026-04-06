import { askLessonQuestion } from '@/mock/demoApi'

const normalizeString = (value, fallback = '') => {
  if (Array.isArray(value)) {
    return normalizeString(value[0], fallback)
  }
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

const normalizeNumber = (value) => {
  const raw = Array.isArray(value) ? value[0] : value
  const nextValue = Number(raw)
  return Number.isFinite(nextValue) ? nextValue : undefined
}

const parseJsonLike = (value, fallback) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return value ?? fallback
}

const readStoredUserId = () => {
  if (typeof window === 'undefined') {
    return ''
  }
  try {
    const raw = localStorage.getItem('userInfo')
    const parsed = raw ? JSON.parse(raw) : {}
    return normalizeString(parsed?.userId)
  } catch {
    return ''
  }
}

const pickResult = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return {}
  }
  if (payload.data && typeof payload.data === 'object') {
    return payload.data
  }
  return payload
}

const normalizeRelatedKnowledge = (value) => {
  const parsed = parseJsonLike(value, value)

  if (!parsed) {
    return []
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim()
        }
        return normalizeString(
          item?.knowledgeName || item?.knowledge_name || item?.name,
        )
      })
      .filter(Boolean)
  }

  const single = normalizeString(
    parsed.knowledgeName || parsed.knowledge_name || parsed.name,
  )
  return single ? [single] : []
}

const normalizeSuggestions = (value) => {
  const parsed = parseJsonLike(value, value)
  if (!Array.isArray(parsed)) {
    return []
  }
  return parsed.map((item) => normalizeString(item)).filter(Boolean)
}

export const interactQA = async (payload = {}) => {
  const response = await askLessonQuestion({
    schoolId: normalizeString(payload.schoolId, 'sch10001'),
    userId: normalizeString(payload.userId, readStoredUserId()),
    courseId: normalizeString(payload.courseId),
    lessonId: normalizeString(payload.lessonId),
    sessionId: normalizeString(payload.sessionId),
    questionType: normalizeString(payload.questionType, 'text'),
    questionContent: normalizeString(payload.question || payload.questionContent),
    question: normalizeString(payload.question || payload.questionContent),
    currentSectionId: normalizeString(payload.currentSectionId),
    currentPage: normalizeNumber(payload.currentPage),
    historyQa: Array.isArray(payload.historyQa) ? payload.historyQa : [],
  })

  const result = pickResult(response)

  return {
    answer: normalizeString(result.answer || result.answerContent || result.answer_content),
    relatedKnowledge: normalizeRelatedKnowledge(
      result.relatedKnowledge || result.related_knowledge,
    ),
    understandingLevel: normalizeString(
      result.understandingLevel || result.understanding_level,
    ),
    suggestions: normalizeSuggestions(result.suggestions),
    answerId: normalizeString(result.answerId || result.answer_id),
    questionType: normalizeString(result.questionType || result.question_type, 'unknown'),
    nextAction: normalizeString(result.nextAction || result.next_action),
    reason: normalizeString(result.reason),
    matchedSectionId: normalizeString(result.matchedSectionId || result.matched_section_id),
    matchedPage: normalizeNumber(result.matchedPage ?? result.matched_page),
    targetSectionId: normalizeString(result.targetSectionId || result.target_section_id),
    targetPage: normalizeNumber(result.targetPage ?? result.target_page),
  }
}
