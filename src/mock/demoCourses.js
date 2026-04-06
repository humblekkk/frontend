export const GENERATED_SMART_COURSE = Object.freeze({
  id: 'course-star-orbit-001',
  lessonId: 'lesson-star-orbit-001',
  name: '星轨探微',
  desc: '介绍天体物理中双星问题，是天体物理的入门问题',
  tag: '物理·天体运动',
  progress: 0,
  lessons: 2,
  hours: 2,
  color: '#2563eb',
  img: '/封面.png',
})

export const GENERATED_SMART_LESSON = Object.freeze({
  lessonId: 'lesson-star-orbit-001',
  courseId: 'course-star-orbit-001',
  lessonTitle: '星轨探微',
  fileName: '双星问题.pptx',
  totalPages: 13,
  previewBasePath: '/双星问题',
  downloadUrl: '/双星问题.pptx',
  sections: [
    {
      sectionId: 'star-sec-1',
      title: '学习目标与课程地图',
      relatedPages: [1, 2, 3],
      keywords: ['双星系统', '三星系统', '学习目标'],
      explainScript: '本节先建立课程全景。课件从专题名称“多星模型问题”切入，随后给出目录与学习目标。核心目标有三层：第一，理解双星系统的概念与基本特征；第二，掌握双星系统的特点和运动规律，能够用万有引力定律与牛顿运动定律分析半径、速度、角速度和周期等物理量；第三，理解三星系统的基本含义，并能分析特殊的三星问题。演示时要先让学生知道，这不是单纯记公式，而是从模型建立、受力分析到规律归纳的一整套方法训练。',
    },
    {
      sectionId: 'star-sec-2',
      title: '新课导入与双星模型定义',
      relatedPages: [4, 5],
      keywords: ['新课导入', '双星模型', '匀速圆周运动'],
      explainScript: '这一部分从问题情境导入：宇宙中两颗星组成稳定旋转系统时，它们究竟如何运动？随后正式定义双星模型，即两个距离较近的天体，在忽略其他天体引力的条件下，只受彼此间万有引力作用，并绕连线上的某一固定点做匀速圆周运动。讲解时要强调三个限定条件：只考虑彼此引力、绕共同中心运动、轨迹近似看作圆周。这样学生才能把真实天体问题抽象成高中物理中可求解的模型。',
    },
    {
      sectionId: 'star-sec-3',
      title: '双星系统的三个基本特点',
      relatedPages: [6],
      keywords: ['向心力', '共同中心', '角速度相同'],
      explainScript: '双星系统的第一个核心板块是模型特点。课件明确给出三条：第一，两恒星之间的万有引力分别提供各自做圆周运动所需的向心力，因此两者所受向心力大小相等；第二，两颗恒星都绕共同中心做匀速圆周运动，且轨道半径满足 r1 + r2 = L；第三，两颗恒星与旋转中心始终共线，因此它们的角速度相同，周期也相同。这一页是后续所有推导的根基，演示时可以把它概括成“同心、同角速、同周期，半径互补”。',
    },
    {
      sectionId: 'star-sec-4',
      title: '双星规律推导：半径、速度、角速度与周期',
      relatedPages: [7, 8, 9],
      keywords: ['半径之比', '线速度之比', '周期公式'],
      explainScript: '这部分是双星模型的计算核心。首先由万有引力提供向心力，对两颗星分别列式，结合 m1r1 = m2r2 和 r1 + r2 = L，可得到半径之比 r1/r2 = m2/m1，并推出质量越大、半径越小、越靠近旋转中心。接着利用 v = ωr 和 an = ω²r，得到线速度之比、向心加速度之比与半径之比相同，也都等于 m2/m1。最后再由受力方程推出角速度公式和周期公式，说明整个系统的角速度和周期由总质量与两星距离决定。讲解时要提醒学生：双星问题最常见的误区，是只盯一颗星列方程，而忘了使用系统共同的运动特征。',
    },
    {
      sectionId: 'star-sec-5',
      title: '经典例题与解题思路总结',
      relatedPages: [10],
      keywords: ['研究对象', '受力分析', '列方程'],
      explainScript: '课件在这一段没有继续堆公式，而是回到方法层面，总结了双星问题的标准解题流程：先确定研究对象，明确分析哪一颗恒星；再做受力分析，确认向心力来源于双星之间的万有引力；随后根据 F万 = F向 列出动力学方程；最后结合双星系统“角速度相同、周期相同、半径关系明确”等特点联立求解。演示时这一页特别重要，因为它能把前面的推导转化为可迁移的做题模板，帮助学生从“会听懂”走向“会自己做”。',
    },
    {
      sectionId: 'star-sec-6',
      title: '特殊三星系统与本课小结',
      relatedPages: [11, 12, 13],
      keywords: ['三星系统', '等边三角形', '课堂小结'],
      explainScript: '课程最后从双星推广到三星。课件先提出三星系统，再选取一个特殊情形：三个质量相同的星体位于等边三角形三个顶点，并共同做匀速圆周运动。通过分解另外两颗星对某一星体的引力，可得到合力大小，再结合圆周运动方程求周期。这一部分的价值在于让学生意识到，多星问题并不总能直接套双星公式，关键仍然是受力分解与几何关系。最后一页对本课进行归纳：双星的三个特点、若干比值规律、总质量与周期的关系，以及角速度公式。演示结束时可以把整节课总结为一句话：先建模，再找共同特征，最后用动力学方程统一求解。',
    },
  ],
})

let generatedCourses = []

const clone = (value) => JSON.parse(JSON.stringify(value))

export const readGeneratedCourses = () => clone(generatedCourses)

export const saveGeneratedCourse = (course) => {
  generatedCourses = [course, ...generatedCourses.filter((item) => item?.id !== course.id)]
}
