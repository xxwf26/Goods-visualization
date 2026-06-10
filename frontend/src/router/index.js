import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/views/layout/index.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/layout/Home.vue'),
        meta: { requiresAuth: true, title: '首页总览' }
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('@/views/project/Projects.vue'),
        meta: { requiresAuth: true, title: '历史周边记录库' }
      },
      {
        path: 'price-records',
        name: 'PriceRecords',
        component: () => import('@/views/price/PriceRecords.vue'),
        meta: { requiresAuth: true, title: '历史周边价格记录库' }
      },
      {
        path: 'price-query',
        name: 'PriceQuery',
        component: () => import('@/views/price/PriceQuery.vue'),
        meta: { requiresAuth: true, title: '历史价格查询' }
      },
      {
        path: 'inspiration',
        name: 'Inspiration',
        component: () => import('@/views/inspiration/Inspiration.vue'),
        meta: { requiresAuth: true, title: '灵感库' }
      },
      {
        path: 'design-notes',
        name: 'DesignNotes',
        component: () => import('@/views/designNote/DesignNotes.vue'),
        meta: { requiresAuth: true, title: '生产/设计注意事项' }
      },
      {
        path: 'suppliers',
        name: 'Suppliers',
        component: () => import('@/views/supplier/Supplier.vue'),
        meta: { requiresAuth: true, title: '供应商库' }
      },
      {
        path: 'import',
        name: 'Import',
        component: () => import('@/views/import/Import.vue'),
        meta: { requiresAuth: true, title: '批量导入' }
      },
      {
        path: 'system/tags',
        name: 'TagManagement',
        component: () => import('@/views/system/Tags.vue'),
        meta: { requiresAuth: true, title: '标签管理' }
      },
      {
        path: 'system/permission',
        name: 'PermissionManagement',
        component: () => import('@/views/system/Permission.vue'),
        meta: { requiresAuth: true, title: '权限管理' }
      },
      {
        path: 'category/:id',
        name: 'CategoryDetail',
        component: () => import('@/views/category/CategoryDetail.vue'),
        meta: { requiresAuth: true, title: '品类详情' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 导航守卫 - Vue Router 4 风格
router.beforeEach((to, from) => {
  // 获取 token
  const token = localStorage.getItem('token')

  // 需要认证的页面
  if (to.meta.requiresAuth !== false) {
    if (!token) {
      // 未登录，重定向到登录页
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }

  // 已登录访问登录页，重定向到首页
  if (to.path === '/login' && token) {
    return '/home'
  }

  // 更新页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 周边可视化系统`
  }

  return true
})

export default router
