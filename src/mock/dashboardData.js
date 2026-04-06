const seededRandom = (seed) => {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

const hashCode = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

const COURSE_PROFILES = {
  'course-1': {
    name: '人工智能导论',
    unit: 'AI 核心原理与感知机模型',
    audience: '大一(2)班',
    studentCount: 45,
    totalPages: 18,
    topicKeywords: ['感知机', '激活函数', '梯度下降'],
    queries: [
      '"老师，为什么 sigmoid 函数要取指数？直接用线性不行吗？"',
      '"反向传播的链式法则跟高数里的一样吗？"',
      '"损失函数最小化和梯度下降是什么关系？"',
    ],
    clusters: [
      { label: '错因 1：激活函数理解偏差', desc: '将 sigmoid 与 ReLU 的适用场景混淆', pct: 38, count: 17 },
      { label: '错因 2：反向传播链路不清', desc: '不理解梯度如何从输出层逐层回传', pct: 36, count: 16 },
      { label: '错因 3：数学基础薄弱', desc: '偏导数与链式求导运算困难', pct: 26, count: 12 },
    ],
    advices: [
      { tag: '可视化增强', tagClass: 'tag-visual', title: '增加计算图动画', content: '建议在此页插入"反向传播计算图"动画，用|红色箭头标注梯度流向|，|蓝色节点展示每层输出|，帮助 38% 学生建立直觉。' },
      { tag: '分支降级', tagClass: 'tag-branch', title: '补充数学前置分支', content: '针对 12 名数学基础薄弱的学生，插入一条"偏导数与链式法则速查"分支，在学生卡壳时自动切入。' },
    ],
  },
  'course-2': {
    name: '机器学习基础',
    unit: '模型评估与交叉验证',
    audience: '大二(1)班',
    studentCount: 52,
    totalPages: 15,
    topicKeywords: ['过拟合', '交叉验证', 'bias-variance'],
    queries: [
      '"K-fold 的 K 越大越好吗？"',
      '"为什么训练集准确率高但测试集很低？"',
      '"正则化参数 λ 怎么选？"',
    ],
    clusters: [
      { label: '错因 1：过拟合判断失误', desc: '无法区分过拟合与欠拟合的表现差异', pct: 42, count: 22 },
      { label: '错因 2：验证策略混淆', desc: '将验证集与测试集的用途搞反', pct: 35, count: 18 },
      { label: '错因 3：正则化原理不明', desc: '不理解 L1/L2 正则化如何约束模型复杂度', pct: 23, count: 12 },
    ],
    advices: [
      { tag: '交互实验', tagClass: 'tag-visual', title: '增加学习曲线交互面板', content: '建议插入"训练/验证误差曲线"交互组件，学生可|拖动滑块调节模型复杂度|，实时观察|过拟合与欠拟合的变化趋势|。' },
      { tag: '动态路由', tagClass: 'tag-branch', title: '补充正则化推导路径', content: '针对 12 名正则化理解困难的学生，自动切入"L1/L2 正则化几何直觉"的降级讲解分支。' },
    ],
  },
  'course-3': {
    name: '数据结构与算法',
    unit: '动态规划入门与状态转移',
    audience: '大一(5)班',
    studentCount: 48,
    totalPages: 20,
    topicKeywords: ['状态转移方程', '最优子结构', '记忆化搜索'],
    queries: [
      '"状态转移方程怎么列？感觉每道题都不一样"',
      '"记忆化搜索和动态规划到底有什么区别？"',
      '"为什么要从子问题开始推？正着想不行吗？"',
    ],
    clusters: [
      { label: '错因 1：状态定义困难', desc: '无法将问题抽象为子问题并定义状态变量', pct: 45, count: 22 },
      { label: '错因 2：递推方向混淆', desc: '分不清自顶向下与自底向上的适用场景', pct: 32, count: 15 },
      { label: '错因 3：边界条件遗漏', desc: '转移方程正确但基础情况处理错误', pct: 23, count: 11 },
    ],
    advices: [
      { tag: '可视化增强', tagClass: 'tag-visual', title: '增加状态转移动画', content: '建议在此页插入"DP 表格逐步填充"动画，用|红色高亮当前状态|，|蓝色标记依赖的子状态|，帮助 45% 学生理解递推过程。' },
      { tag: '分支降级', tagClass: 'tag-branch', title: '补充递归到 DP 的过渡讲解', content: '针对 15 名方向混淆的学生，插入一条"从暴力递归 → 记忆化 → 递推"的渐进式讲解分支。' },
    ],
  },
  'course-4': {
    name: 'Python 程序设计',
    unit: '面向对象编程与类继承',
    audience: '大一(3)班',
    studentCount: 55,
    totalPages: 16,
    topicKeywords: ['类', '继承', '多态'],
    queries: [
      '"self 参数到底是什么？为什么每个方法都要写？"',
      '"子类调用父类方法用 super() 还是直接写类名？"',
      '"什么时候该用继承，什么时候该用组合？"',
    ],
    clusters: [
      { label: '错因 1：self 理解偏差', desc: '不理解实例方法中 self 的绑定机制', pct: 40, count: 22 },
      { label: '错因 2：继承链混乱', desc: '多继承场景下 MRO 解析顺序不清', pct: 35, count: 19 },
      { label: '错因 3：封装意识缺失', desc: '直接访问私有属性而非通过方法接口', pct: 25, count: 14 },
    ],
    advices: [
      { tag: '交互实验', tagClass: 'tag-visual', title: '增加对象内存模型图', content: '建议在此页插入"对象内存布局"可视化，用|红色标注实例属性|，|蓝色标注类属性|，让学生直观看到 self 的指向关系。' },
      { tag: '动态路由', tagClass: 'tag-branch', title: '补充继承实战分支', content: '针对 19 名继承链混乱的学生，插入一条"从单继承到多继承的逐步构建"分支进行补漏。' },
    ],
  },
}

const CLUSTER_COLORS = ['#ef4444', '#f59e0b', '#3b82f6']

export const generateDashboardData = (courseId) => {
  const profile = COURSE_PROFILES[courseId]
  const rand = seededRandom(hashCode(courseId || 'default'))

  const name = profile?.name || '未知课程'
  const unit = profile?.unit || '综合学习单元'
  const audience = profile?.audience || '默认班级'
  const studentCount = profile?.studentCount || 40
  const totalPages = profile?.totalPages || 12

  const barData = []
  let totalInteractions = 0
  let maxVal = 0
  let maxPage = 0

  for (let i = 1; i <= totalPages; i++) {
    const base = Math.floor(rand() * 20) + 3
    const val = Math.min(base, 50)
    totalInteractions += val
    if (val > maxVal) {
      maxVal = val
      maxPage = i
    }
    barData.push({ page: `页${i}`, val, pct: 0, danger: false })
  }

  barData.forEach((b) => {
    b.pct = Math.round((b.val / maxVal) * 100)
  })
  const dangerIdx = barData.findIndex((b) => b.val === maxVal)
  if (dangerIdx >= 0) {
    barData[dangerIdx].danger = true
  }

  const clusters = (profile?.clusters || [
    { label: '错因 1：核心概念混淆', desc: '基础定义理解有偏差', pct: 44, count: Math.round(studentCount * 0.44) },
    { label: '错因 2：模型应用失败', desc: '无法将理论映射到实际场景', pct: 33, count: Math.round(studentCount * 0.33) },
    { label: '错因 3：基础运算薄弱', desc: '计算与推导过程出错', pct: 23, count: Math.round(studentCount * 0.23) },
  ]).map((c, i) => ({ ...c, color: CLUSTER_COLORS[i] || '#6b7280' }))

  const nlpConfidence = (85 + rand() * 12).toFixed(1)

  return {
    courseName: name,
    courseUnit: unit,
    audience,
    studentCount,
    totalPages,
    totalInteractions,
    dangerNode: `Node_${maxPage}`,
    dangerPage: maxPage,
    nlpConfidence: `${nlpConfidence}%`,
    adviceCount: profile?.advices?.length || 2,
    barData,
    rawQueries: profile?.queries || [
      '"这个概念和之前学的有什么区别？"',
      '"公式推导过程能再讲一遍吗？"',
      '"实际应用中是怎么使用的？"',
    ],
    clusters,
    advices: profile?.advices || [
      { tag: '可视化增强', tagClass: 'tag-visual', title: '增加概念对比图', content: '建议插入对比图，用|红色标注易混淆概念|，|蓝色标注正确理解|，帮助学生区分。' },
      { tag: '分支降级', tagClass: 'tag-branch', title: '补充基础前置分支', content: '针对基础薄弱的学生，插入前置知识讲解分支，在卡壳时自动切入。' },
    ],
  }
}
