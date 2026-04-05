export const learningPathOverview = {
  completionRate: 68,
  streakDays: 12,
  weeklyHours: 9.5,
  nextMilestone: '完成“神经网络基础”阶段测验',
}

export const learningPathStages = [
  {
    id: 'stage-1',
    phase: '阶段 01',
    title: 'AI 基础认知',
    progress: 100,
    status: 'completed',
    duration: '第 1-2 周',
    focus: '建立概念框架，理解 AI、机器学习与深度学习之间的关系。',
    modules: ['人工智能概览', '机器学习范式', '典型应用场景'],
    outcome: '已完成 3/3 个模块',
  },
  {
    id: 'stage-2',
    phase: '阶段 02',
    title: '数学与建模基础',
    progress: 76,
    status: 'active',
    duration: '第 3-5 周',
    focus: '补足线性代数、概率统计与优化的关键直觉，支撑后续模型理解。',
    modules: ['向量与矩阵', '概率分布', '梯度下降'],
    outcome: '推荐优先复习“梯度下降”与“损失函数”',
  },
  {
    id: 'stage-3',
    phase: '阶段 03',
    title: '神经网络基础',
    progress: 42,
    status: 'upcoming',
    duration: '第 6-8 周',
    focus: '从单层感知机过渡到多层网络，理解前向传播与反向传播。',
    modules: ['感知机', '多层网络', '反向传播'],
    outcome: '解锁条件：完成数学基础阶段',
  },
  {
    id: 'stage-4',
    phase: '阶段 04',
    title: '项目实战与复盘',
    progress: 8,
    status: 'planned',
    duration: '第 9-12 周',
    focus: '围绕真实案例完成一次完整建模流程，形成可复用的方法论。',
    modules: ['数据清洗', '模型训练', '实验复盘'],
    outcome: '结项输出：项目报告 + 讲解视频',
  },
]

export const learningPathMilestones = [
  {
    id: 'm-1',
    title: '下一次测验',
    detail: '周四 19:30 · 神经网络基础随堂测',
    accent: '#2563eb',
  },
  {
    id: 'm-2',
    title: '目标证书',
    detail: 'AI 导论阶段认证 · 还差 18 学习积分',
    accent: '#0891b2',
  },
  {
    id: 'm-3',
    title: '复习提醒',
    detail: '建议本周回看 2 次“梯度下降”讲解',
    accent: '#059669',
  },
]

export const weeklyLearningPlan = [
  {
    id: 'w-1',
    day: '周一',
    title: '线性代数回顾',
    minutes: 45,
    tag: '基础巩固',
    done: true,
  },
  {
    id: 'w-2',
    day: '周二',
    title: '梯度下降专题课',
    minutes: 60,
    tag: '重点突破',
    done: true,
  },
  {
    id: 'w-3',
    day: '周三',
    title: '知识点自测',
    minutes: 25,
    tag: '测验',
    done: false,
  },
  {
    id: 'w-4',
    day: '周四',
    title: '课堂讨论与问答',
    minutes: 40,
    tag: '互动',
    done: false,
  },
  {
    id: 'w-5',
    day: '周五',
    title: '案例代码跟练',
    minutes: 70,
    tag: '实战',
    done: false,
  },
]

export const skillProgress = [
  { id: 's-1', label: '数学基础', value: 82, color: '#2563eb' },
  { id: 's-2', label: '建模思维', value: 71, color: '#0891b2' },
  { id: 's-3', label: '代码实现', value: 64, color: '#0f766e' },
  { id: 's-4', label: '结果表达', value: 58, color: '#d97706' },
]

export const leaderboardTopThree = [
  {
    id: 'u-1',
    name: '陈思远',
    score: 1560,
    rank: 2,
    streak: 15,
    courses: 7,
    badge: '稳定推进',
  },
  {
    id: 'u-2',
    name: '林知夏',
    score: 1688,
    rank: 1,
    streak: 21,
    courses: 8,
    badge: '本周领先',
  },
  {
    id: 'u-3',
    name: '周靖',
    score: 1482,
    rank: 3,
    streak: 13,
    courses: 6,
    badge: '持续跟进',
  },
]

export const leaderboardEntries = [
  { id: 'u-4', rank: 4, name: '赵闻笙', score: 1396, growth: '+11%', focus: '机器学习基础', minutes: 640 },
  { id: 'u-5', rank: 5, name: '许安', score: 1318, growth: '+9%', focus: 'Python 程序设计', minutes: 598 },
  { id: 'u-6', rank: 6, name: '沈清禾', score: 1262, growth: '+14%', focus: '数据结构与算法', minutes: 576 },
  { id: 'u-7', rank: 7, name: '你', score: 1216, growth: '+18%', focus: '人工智能导论', minutes: 552, isCurrentUser: true },
  { id: 'u-8', rank: 8, name: '蒋舟', score: 1184, growth: '+7%', focus: '人工智能导论', minutes: 531 },
  { id: 'u-9', rank: 9, name: '吴昀', score: 1138, growth: '+5%', focus: '机器学习基础', minutes: 516 },
  { id: 'u-10', rank: 10, name: '冯恬', score: 1096, growth: '+4%', focus: 'Python 程序设计', minutes: 493 },
]

export const leaderboardInsights = [
  {
    id: 'i-1',
    title: '进入前五还差',
    value: '102 分',
    detail: '完成 2 次专题练习和 1 次课堂测验，基本可以追平。',
  },
  {
    id: 'i-2',
    title: '本周成长率',
    value: '+18%',
    detail: '当前增速在前十里排第 2，保持节奏还有上升空间。',
  },
  {
    id: 'i-3',
    title: '建议优先课程',
    value: '人工智能导论',
    detail: '这门课的问答得分还有提升空间，适合用来快速补分。',
  },
]
