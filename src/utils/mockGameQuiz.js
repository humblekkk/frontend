const readText = (value, fallback = '') => {
  if (Array.isArray(value)) return readText(value[0], fallback)
  return (typeof value === 'string' && value.trim()) ? value.trim() : fallback
}

const readPositiveNumber = (value, fallback = 1) => {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback
}

export const parseMockGameContext = (query = {}) => ({
  courseName: readText(query.courseName, '课程学习'),
  lessonTitle: readText(query.lessonTitle, '当前课时'),
  sectionTitle: readText(query.sectionTitle, '核心知识点'),
  currentPage: readPositiveNumber(query.currentPage, 1),
  courseId: readText(query.courseId, ''),
})

const QUESTION_BANKS = {
  '人工智能导论': [
    { q: '感知机模型中，激活函数的主要作用是什么？', opts: ['引入非线性变换能力', '加速数据读取', '压缩存储空间', '增加网络层数'], ans: 0, hint: '想想线性模型的局限性', kp: '感知机' },
    { q: '下列哪项不是深度学习相比传统机器学习的优势？', opts: ['自动特征提取', '端到端学习', '不需要任何数据', '处理非结构化数据能力强'], ans: 2, hint: '深度学习对数据量有什么要求？', kp: '深度学习' },
    { q: '反向传播算法的核心数学工具是？', opts: ['链式求导法则', '拉格朗日乘数法', '傅里叶变换', '矩阵分解'], ans: 0, hint: '梯度如何从输出传到输入？', kp: '反向传播' },
    { q: '卷积神经网络（CNN）最适合处理哪类数据？', opts: ['图像和视频', '纯文本', '表格数据', '时间序列'], ans: 0, hint: '想想卷积操作的空间特性', kp: 'CNN' },
    { q: 'Transformer 模型的核心机制是？', opts: ['自注意力机制', '循环连接', '池化操作', '决策树集成'], ans: 0, hint: 'Attention is all you need', kp: 'Transformer' },
    { q: '在神经网络训练中，学习率过大会导致什么问题？', opts: ['损失值震荡甚至发散', '训练速度过慢', '模型参数不更新', '显存不足'], ans: 0, hint: '参数更新的步长太大会怎样？', kp: '优化' },
    { q: '下列哪个是无监督学习任务？', opts: ['聚类分析', '图像分类', '语音识别', '机器翻译'], ans: 0, hint: '哪个任务不需要标注数据？', kp: '机器学习分类' },
    { q: '过拟合的典型表现是？', opts: ['训练集表现好但测试集表现差', '训练集和测试集都表现差', '训练速度非常慢', '模型参数全部为零'], ans: 0, hint: '模型"记住"了训练数据会怎样？', kp: '过拟合' },
    { q: 'GPT 系列模型属于哪种架构？', opts: ['仅解码器的 Transformer', '仅编码器的 Transformer', '编码器-解码器', '循环神经网络'], ans: 0, hint: '它是如何生成文本的？', kp: '大语言模型' },
    { q: '词嵌入（Word Embedding）的作用是？', opts: ['将词语映射为稠密向量', '统计词频', '分割句子', '翻译语言'], ans: 0, hint: '如何让计算机"理解"词义？', kp: 'NLP' },
    { q: 'Dropout 正则化技术的原理是？', opts: ['训练时随机丢弃部分神经元', '删除多余的网络层', '降低输入数据维度', '减少训练轮数'], ans: 0, hint: '防止神经元之间的过度依赖', kp: '正则化' },
    { q: '批量归一化（Batch Normalization）的主要好处是？', opts: ['加速收敛并稳定训练', '减少模型参数量', '增加网络深度', '替代激活函数'], ans: 0, hint: '它对每层输入做了什么？', kp: '训练技巧' },
  ],
  '机器学习基础': [
    { q: '在 K 折交叉验证中，数据被分成 K 份，每次用几份做训练？', opts: ['K-1 份', 'K 份', '1 份', 'K/2 份'], ans: 0, hint: '留一份做验证，其余呢？', kp: '交叉验证' },
    { q: '下列哪个指标最适合评估不平衡数据集上的分类器性能？', opts: ['F1-Score', '准确率', '训练时间', '参数数量'], ans: 0, hint: '当正负样本比例悬殊时准确率有什么问题？', kp: '模型评估' },
    { q: 'L1 正则化（Lasso）与 L2 正则化（Ridge）的关键区别是？', opts: ['L1 倾向于产生稀疏权重', 'L1 计算速度更快', 'L2 无法处理高维数据', '两者完全等价'], ans: 0, hint: '哪种正则化能做特征选择？', kp: '正则化' },
    { q: '决策树容易出现什么问题？', opts: ['过拟合', '无法处理分类任务', '只能用于回归', '不支持多特征'], ans: 0, hint: '树长得越深越可能怎样？', kp: '决策树' },
    { q: '随机森林通过什么方式降低过拟合风险？', opts: ['集成多棵树并取平均/投票', '只用一棵最优树', '减少训练数据量', '去掉所有特征'], ans: 0, hint: '为什么"森林"比"单棵树"更稳定？', kp: '集成学习' },
    { q: '梯度下降算法中，"梯度"指的是？', opts: ['损失函数对参数的偏导数', '训练数据的均值', '模型预测的置信度', '特征的数量'], ans: 0, hint: '梯度指向损失增长最快的方向', kp: '优化算法' },
    { q: 'SVM 中"支持向量"是指什么？', opts: ['距离决策边界最近的样本点', '所有训练样本', '错误分类的样本', '特征空间的维度'], ans: 0, hint: '哪些点决定了分类超平面？', kp: 'SVM' },
    { q: '主成分分析（PCA）的主要目的是？', opts: ['降低数据维度同时保留主要信息', '增加特征数量', '对数据做分类', '提高训练速度'], ans: 0, hint: '用更少的维度表达数据', kp: '降维' },
    { q: '朴素贝叶斯分类器的"朴素"体现在？', opts: ['假设各特征之间相互独立', '模型结构简单', '不需要训练', '只能处理二分类'], ans: 0, hint: '它对特征之间的关系做了什么假设？', kp: '贝叶斯' },
    { q: '在回归任务中，MSE（均方误差）的计算方式是？', opts: ['预测值与真实值差的平方的均值', '预测值与真实值差的绝对值', '正确预测的比例', '特征与标签的协方差'], ans: 0, hint: '平方是为了消除正负号', kp: '回归' },
    { q: 'K-Means 聚类算法需要预先指定什么？', opts: ['聚类数目 K', '每个样本的标签', '特征权重', '迭代次数上限'], ans: 0, hint: '算法名字里的 K 代表什么？', kp: '聚类' },
    { q: '特征工程中，独热编码（One-Hot Encoding）用于处理？', opts: ['类别型特征', '连续数值特征', '缺失值', '异常值'], ans: 0, hint: '如何把"颜色=红/绿/蓝"转为数值？', kp: '特征工程' },
  ],
  '数据结构与算法': [
    { q: '快速排序的平均时间复杂度是？', opts: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'], ans: 0, hint: '每次划分大约把数组分成两半', kp: '排序' },
    { q: '栈（Stack）的特点是？', opts: ['后进先出（LIFO）', '先进先出（FIFO）', '随机访问', '按优先级出队'], ans: 0, hint: '想象一摞盘子', kp: '栈' },
    { q: '二叉搜索树中，查找一个节点的最坏时间复杂度是？', opts: ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'], ans: 0, hint: '当树退化为链表时会怎样？', kp: '二叉搜索树' },
    { q: '动态规划问题必须满足的两个关键性质是？', opts: ['最优子结构和重叠子问题', '随机性和有序性', '线性和对称性', '递增性和收敛性'], ans: 0, hint: '为什么能用"表格"来求解？', kp: '动态规划' },
    { q: '图的广度优先搜索（BFS）使用什么数据结构？', opts: ['队列', '栈', '堆', '数组'], ans: 0, hint: 'BFS 按层遍历', kp: '图搜索' },
    { q: '哈希表发生冲突时，链地址法的处理方式是？', opts: ['将冲突元素存入同一位置的链表', '重新计算哈希', '丢弃冲突元素', '扩大数组'], ans: 0, hint: '每个"桶"里可以放多个元素', kp: '哈希表' },
    { q: '堆排序使用的核心数据结构是？', opts: ['最大堆或最小堆', '二叉搜索树', '链表', '栈'], ans: 0, hint: '堆的根节点有什么特殊性质？', kp: '堆' },
    { q: 'Dijkstra 算法用于求解什么问题？', opts: ['单源最短路径', '最小生成树', '拓扑排序', '最大流'], ans: 0, hint: '从一个起点到所有其他点', kp: '最短路径' },
    { q: '红黑树相比普通二叉搜索树的优势是？', opts: ['保证 O(log n) 的操作复杂度', '实现更简单', '不需要旋转操作', '占用更少内存'], ans: 0, hint: '它是一种自平衡树', kp: '平衡树' },
    { q: '归并排序的空间复杂度是？', opts: ['O(n)', 'O(1)', 'O(log n)', 'O(n²)'], ans: 0, hint: '合并两个有序数组需要额外空间', kp: '排序' },
    { q: '在有向无环图（DAG）中，拓扑排序保证什么？', opts: ['所有边从排序前面的节点指向后面的节点', '节点按字母序排列', '所有节点度数相同', '图是连通的'], ans: 0, hint: '想想课程先修关系', kp: '拓扑排序' },
    { q: '斐波那契数列用递归实现时间复杂度为 O(2ⁿ)，用动态规划可优化到？', opts: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], ans: 0, hint: '每个子问题只需计算一次', kp: '动态规划' },
  ],
  'Python 程序设计': [
    { q: 'Python 中 list 和 tuple 的主要区别是？', opts: ['list 可变，tuple 不可变', '两者完全相同', 'tuple 更长', 'list 只能存数字'], ans: 0, hint: '创建后能否修改？', kp: '数据类型' },
    { q: 'Python 中装饰器（decorator）的作用是？', opts: ['在不修改函数代码的情况下扩展功能', '加速函数运行', '自动添加类型检查', '替代 import 语句'], ans: 0, hint: '@符号的语法糖', kp: '装饰器' },
    { q: '以下哪个是 Python 的可变数据类型？', opts: ['dict', 'str', 'tuple', 'int'], ans: 0, hint: '创建后能否修改内容？', kp: '数据类型' },
    { q: 'Python 中 __init__ 方法的作用是？', opts: ['初始化实例属性', '删除对象', '定义类方法', '导入模块'], ans: 0, hint: '创建对象时自动调用', kp: '面向对象' },
    { q: '列表推导式 [x**2 for x in range(5)] 的结果是？', opts: ['[0, 1, 4, 9, 16]', '[1, 4, 9, 16, 25]', '[0, 2, 4, 6, 8]', '[1, 2, 3, 4, 5]'], ans: 0, hint: 'range(5) 从 0 到 4', kp: '列表推导' },
    { q: 'Python 中 try-except 用于处理什么？', opts: ['运行时异常', '语法错误', '缩进问题', '导入冲突'], ans: 0, hint: '程序运行中可能出现的错误', kp: '异常处理' },
    { q: 'Python 中 self 参数表示什么？', opts: ['当前实例对象', '当前类', '父类', '全局变量'], ans: 0, hint: '谁在调用这个方法？', kp: '面向对象' },
    { q: 'Python 的 GIL（全局解释器锁）的影响是？', opts: ['同一时刻只能有一个线程执行 Python 字节码', '禁止使用多进程', '加速所有并发操作', '只影响 I/O 操作'], ans: 0, hint: '它是 CPython 的限制', kp: '并发' },
    { q: 'Python 中 *args 的含义是？', opts: ['接收任意数量的位置参数', '定义关键字参数', '解包字典', '创建生成器'], ans: 0, hint: '函数参数个数不确定时怎么办？', kp: '函数' },
    { q: '以下哪种方式可以正确读取文件？', opts: ['with open("f.txt") as f: f.read()', 'read("f.txt")', 'file.get("f.txt")', 'import "f.txt"'], ans: 0, hint: 'with 语句确保文件正确关闭', kp: '文件操作' },
    { q: 'Python 中生成器（generator）的优势是？', opts: ['惰性求值，节省内存', '运行速度最快', '自动并行处理', '替代所有循环'], ans: 0, hint: '需要时才计算下一个值', kp: '生成器' },
    { q: 'pip install 命令用于？', opts: ['安装第三方 Python 包', '编译 Python 代码', '创建虚拟环境', '更新 Python 版本'], ans: 0, hint: 'Python 的包管理工具', kp: '工具链' },
  ],
  '线性代数': [
    { q: '双星系统中，两颗星绕共同的什么做圆周运动？', opts: ['质心（连线上的某一固定点）', '较大星体中心', '连线中点', '系统外的某一固定点'], ans: 0, hint: '两星的"共同旋转中心"', kp: '双星模型' },
    { q: '双星系统中，提供向心力的力是什么？', opts: ['彼此间的万有引力', '外部天体的引力', '系统的弹力', '电磁力'], ans: 0, hint: '忽略其他天体的情况下', kp: '向心力' },
    { q: '双星系统中，两颗星的角速度关系是？', opts: ['角速度相同', '质量大的角速度大', '质量小的角速度大', '角速度之比等于质量之比'], ans: 0, hint: '它们始终共线旋转', kp: '角速度' },
    { q: '若 m₁ > m₂，则两星轨道半径的关系是？', opts: ['r₁ < r₂', 'r₁ > r₂', 'r₁ = r₂', '无法确定'], ans: 0, hint: 'm₁r₁ = m₂r₂', kp: '半径关系' },
    { q: '双星系统中，两星轨道半径之和等于什么？', opts: ['两星之间的距离 L', '两星质量之和', '万有引力常量', '轨道周期'], ans: 0, hint: 'r₁ + r₂ = ?', kp: '几何关系' },
    { q: '双星系统的周期公式中，周期 T 与总质量 M 的关系是？', opts: ['M 越大，T 越小', 'M 越大，T 越大', '无关', '线性正比'], ans: 0, hint: '类比开普勒第三定律', kp: '周期' },
    { q: '双星中线速度之比 v₁/v₂ 等于什么？', opts: ['r₁/r₂ = m₂/m₁', 'm₁/m₂', 'r₂/r₁', '1'], ans: 0, hint: 'v = ωr 且角速度相同', kp: '线速度' },
    { q: '三星系统中，若三星质量相同且位于等边三角形顶点，它们绕哪里运动？', opts: ['等边三角形的中心', '其中一颗星', '三角形的一条边中点', '系统外部'], ans: 0, hint: '对称性意味着什么？', kp: '三星系统' },
    { q: '分析双星问题的标准第一步是？', opts: ['确定研究对象', '直接列方程', '画受力图', '代入数值'], ans: 0, hint: '先明确分析哪颗星', kp: '解题方法' },
    { q: '双星系统中，向心加速度之比 a₁/a₂ 等于什么？', opts: ['r₁/r₂ = m₂/m₁', 'm₁/m₂', '1', 'r₂²/r₁²'], ans: 0, hint: 'a = ω²r 且角速度相同', kp: '向心加速度' },
    { q: '为什么双星问题中不能将 r 与 L 混淆？', opts: ['r 是轨道半径，L 是两星间距，r₁+r₂=L', 'r 和 L 是相同的量', 'L 是半径的倒数', 'r 只在三星中使用'], ans: 0, hint: '这是最常见的认知误区', kp: '概念辨析' },
    { q: '等边三角形三星系统中，合力方向指向哪里？', opts: ['等边三角形中心', '对边中点', '其中一颗邻星', '系统外部'], ans: 0, hint: '两个引力的矢量合成', kp: '三星受力' },
  ],
}

const hashSeed = (str) => {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

const seededShuffle = (arr, seed) => {
  const result = [...arr]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const findBank = (courseName) => {
  for (const key of Object.keys(QUESTION_BANKS)) {
    if (courseName.includes(key) || key.includes(courseName)) {
      return QUESTION_BANKS[key]
    }
  }
  return QUESTION_BANKS['人工智能导论']
}

export const buildGameLevels = (context) => {
  const { courseName, lessonTitle, sectionTitle } = context
  const bank = findBank(courseName)
  const seed = hashSeed(`${courseName}-${lessonTitle}-${sectionTitle}`)
  const shuffled = seededShuffle(bank, seed)

  const LEVELS = [
    { name: '基础热身', desc: '巩固核心概念', icon: '🌱', count: 3 },
    { name: '概念强化', desc: '深入理解原理', icon: '🔥', count: 3 },
    { name: '综合挑战', desc: '融会贯通', icon: '⚡', count: 3 },
    { name: '终极闯关', desc: '全面检验掌握程度', icon: '🏆', count: 3 },
  ]

  let qIdx = 0
  return LEVELS.map((level, levelIdx) => {
    const questions = []
    for (let i = 0; i < level.count && qIdx < shuffled.length; i++, qIdx++) {
      const raw = shuffled[qIdx]
      const optionsSeed = seed + qIdx * 7 + levelIdx
      const correctText = raw.opts[raw.ans]
      const shuffledOpts = seededShuffle(raw.opts, optionsSeed)
      const correctIndex = shuffledOpts.indexOf(correctText)

      questions.push({
        id: `q-${levelIdx}-${i}`,
        question: raw.q,
        options: shuffledOpts,
        correctIndex,
        hint: raw.hint,
        knowledgePoint: raw.kp,
        baseScore: 25 + levelIdx * 5,
      })
    }
    return { ...level, id: `level-${levelIdx}`, questions }
  })
}
