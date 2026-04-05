import {
  addKnowledgeBaseSources,
  askLessonQuestion,
  buildKnowledgeBaseIndex,
  createKnowledgeBase,
  getKnowledgeBaseDetail,
  listKnowledgeBases,
} from '@/mock/demoApi'

const wrap = (data) => Promise.resolve({ data: { code: 200, data } })

const normalizeUrl = (url = '') => String(url || '').trim()

const buildRawQaPayload = async (payload = {}) => {
  const result = await askLessonQuestion(payload)
  return {
    answerContent: result.answer,
    relatedKnowledge: result.relatedKnowledge,
    understandingLevel: result.understandingLevel,
    suggestions: result.suggestions,
    answerId: result.answerId,
    questionType: result.questionType,
    nextAction: result.nextAction,
    reason: result.reason,
    matchedSectionId: result.matchedSectionId,
    matchedPage: result.matchedPage,
    targetSectionId: result.targetSectionId,
    targetPage: result.targetPage,
  }
}

export default {
  async get(url) {
    const target = normalizeUrl(url)

    if (target === '/internal/kb/list') {
      return wrap(await listKnowledgeBases())
    }

    if (target.startsWith('/internal/kb/status/')) {
      return wrap(await getKnowledgeBaseDetail(target.split('/').pop()))
    }

    return wrap({})
  },

  async post(url, payload = {}) {
    const target = normalizeUrl(url)

    if (target === '/api/v1/qa/interact') {
      return wrap(await buildRawQaPayload(payload))
    }

    if (target === '/internal/kb/create') {
      return wrap(await createKnowledgeBase(payload))
    }

    if (target === '/internal/kb/addSources') {
      return wrap(await addKnowledgeBaseSources(payload))
    }

    if (target === '/internal/kb/build') {
      return wrap(await buildKnowledgeBaseIndex(payload))
    }

    return wrap(payload)
  },
}
