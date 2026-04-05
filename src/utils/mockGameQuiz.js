const readText = (value, fallback = '') => {
  if (Array.isArray(value)) {
    return readText(value[0], fallback)
  }
  if (typeof value !== 'string') {
    return fallback
  }
  const normalized = value.trim()
  return normalized || fallback
}

const readPositiveNumber = (value, fallback = 1) => {
  const normalized = Number(Array.isArray(value) ? value[0] : value)
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback
  }
  return Math.round(normalized)
}

const slugify = (value) => {
  const source = readText(value, 'practice-quiz')
  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return slug || 'practice-quiz'
}

const buildOption = (questionId, index, text, isCorrect = false) => ({
  id: `${questionId}_option_${index + 1}`,
  text,
  isCorrect,
})

const buildQuestion = ({ quizId, index, question, subject, knowledgePoint, hint, score, options }) => ({
  id: `${quizId}_question_${index + 1}`,
  question,
  subject,
  knowledgePoint,
  hint,
  score,
  options: options.map((option, optionIndex) => buildOption(`${quizId}_question_${index + 1}`, optionIndex, option.text, option.isCorrect)),
})

export const parseMockGameContext = (query = {}) => {
  const courseName = readText(query.courseName, '课程学习')
  const lessonTitle = readText(query.lessonTitle, '当前课时')
  const sectionTitle = readText(query.sectionTitle, '核心知识点')
  const currentPage = readPositiveNumber(query.currentPage, 1)

  return {
    courseName,
    lessonTitle,
    sectionTitle,
    currentPage,
  }
}

export const buildMockGameQuiz = (context = {}) => {
  const { courseName, lessonTitle, sectionTitle, currentPage } = parseMockGameContext(context)
  const quizId = `lesson-${slugify(`${courseName}-${lessonTitle}-${sectionTitle}`)}`
  const scorePerQuestion = 25

  return {
    id: quizId,
    name: `${lessonTitle} 练习闯关`,
    totalScore: scorePerQuestion * 4,
    questions: [
      buildQuestion({
        quizId,
        index: 0,
        question: '你当前进入练习闯关的课时是哪个？',
        subject: courseName,
        knowledgePoint: lessonTitle,
        hint: '先确认页面上方展示的课时标题。',
        score: scorePerQuestion,
        options: [
          { text: lessonTitle, isCorrect: true },
          { text: `${lessonTitle} 复盘`, isCorrect: false },
          { text: `${courseName} 综合测试`, isCorrect: false },
          { text: '通用训练模式', isCorrect: false },
        ],
      }),
      buildQuestion({
        quizId,
        index: 1,
        question: '本次闯关默认聚焦的知识点是什么？',
        subject: courseName,
        knowledgePoint: sectionTitle,
        hint: '练习入口会带上 lesson player 当前所在的小节标题。',
        score: scorePerQuestion,
        options: [
          { text: sectionTitle, isCorrect: true },
          { text: `${lessonTitle} 课前导入`, isCorrect: false },
          { text: `${courseName} 期末总复习`, isCorrect: false },
          { text: '课堂外延阅读', isCorrect: false },
        ],
      }),
      buildQuestion({
        quizId,
        index: 2,
        question: '当前传入游戏的课件页码是几？',
        subject: lessonTitle,
        knowledgePoint: `第 ${currentPage} 页`,
        hint: '按钮会把 lesson player 当前页码一并带入游戏。',
        score: scorePerQuestion,
        options: [
          { text: `第 ${currentPage} 页`, isCorrect: true },
          { text: `第 ${currentPage + 1} 页`, isCorrect: false },
          { text: `第 ${currentPage + 3} 页`, isCorrect: false },
          { text: `第 ${currentPage + 5} 页`, isCorrect: false },
        ],
      }),
      buildQuestion({
        quizId,
        index: 3,
        question: '完成本次练习后，最合理的下一步是什么？',
        subject: lessonTitle,
        knowledgePoint: '学习策略',
        hint: '这是前端 mock 题，答案遵循“先复盘再推进”的学习节奏。',
        score: scorePerQuestion,
        options: [
          { text: '记录错题并继续下一节学习', isCorrect: true },
          { text: '直接退出，不再回看错题', isCorrect: false },
          { text: '跳过复盘，重复提交同一题', isCorrect: false },
          { text: '关闭课件，忽略本节重点', isCorrect: false },
        ],
      }),
    ],
  }
}
