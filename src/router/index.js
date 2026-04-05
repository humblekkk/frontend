import { createRouter, createWebHistory } from 'vue-router'
import { useLessonStore } from '@/store/lessonStore'
import { useUserStore } from '@/store/userStore'

const DEFAULT_HOME_PATH = '/home'

const routes = [
  {
    path: '/',
    redirect: DEFAULT_HOME_PATH,
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: {
      label: '登录',
    },
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: {
      label: '首页',
    },
  },
  {
    path: '/learning-path',
    name: 'LearningPath',
    component: () => import('@/views/LearningPath.vue'),
    meta: {
      label: '学习路径',
    },
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: () => import('@/views/Leaderboard.vue'),
    meta: {
      label: '排行榜',
    },
  },
  {
    path: '/teacherupload',
    redirect: '/teacher/upload',
  },
  {
    path: '/teacher/upload',
    name: 'TeacherUpload',
    component: () => import('@/views/TeacherUpload.vue'),
    meta: {
      label: '教师工作台',
      roles: ['teacher'],
    },
  },
  {
    path: '/teacher/script-editor',
    name: 'ScriptEditor',
    component: () => import('@/views/ScriptEditor.vue'),
    meta: {
      label: '脚本编辑',
      roles: ['teacher'],
    },
  },
  {
    path: '/lesson/player',
    name: 'LessonPlayer',
    component: () => import('@/views/LessonPlayer.vue'),
    meta: {
      label: '课堂学习',
      roles: ['student', 'teacher'],
    },
  },
  {
    path: '/lesson/game',
    name: 'LessonGame',
    component: () => import('@/views/GamePlayer.vue'),
    meta: {
      label: 'Practice Game',
      roles: ['student', 'teacher'],
    },
  },
]

const readQueryString = (value) => {
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return typeof value === 'string' ? value : ''
}

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  const isLogin = Boolean(userStore.token)

  if (!isLogin && to.path !== '/login') {
    return '/login'
  }

  if (isLogin && to.path === '/login') {
    return DEFAULT_HOME_PATH
  }

  const routeRoles = to.meta?.roles
  if (Array.isArray(routeRoles) && routeRoles.length) {
    const userRole = userStore.userInfo.role
    if (!routeRoles.includes(userRole)) {
      return DEFAULT_HOME_PATH
    }
  }

  const store = useLessonStore()
  store.syncPlatformContext({
    schoolId: readQueryString(to.query.schoolId),
    courseId: readQueryString(to.query.courseId),
    userId: readQueryString(to.query.userId),
    lessonId: readQueryString(to.query.lessonId),
    role: readQueryString(to.query.role) || userStore.userInfo.role || 'student',
    token: readQueryString(to.query.token),
  })

  return true
})

export default router
