import { createRouter, createWebHistory } from 'vue-router'
import { getFirstAccessibleRoute, hasSessionPermission } from './lib/access'
import AdminLayout from './views/AdminLayout.vue'
import AdminUsersView from './views/AdminUsersView.vue'
import DashboardView from './views/DashboardView.vue'
import DictionaryView from './views/DictionaryView.vue'
import FinanceView from './views/FinanceView.vue'
import MenuManagementView from './views/MenuManagementView.vue'
import OrdersView from './views/OrdersView.vue'
import RoleManagementView from './views/RoleManagementView.vue'
import ServicesView from './views/ServicesView.vue'
import SystemSettingsView from './views/SystemSettingsView.vue'
import WorkersView from './views/WorkersView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AdminLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
          meta: { permission: 'dashboard:view' },
        },
        {
          path: 'services',
          name: 'services',
          component: ServicesView,
          meta: { permission: 'services:view' },
        },
        {
          path: 'orders',
          name: 'orders',
          component: OrdersView,
          meta: { permission: 'orders:view' },
        },
        {
          path: 'workers',
          name: 'workers',
          component: WorkersView,
          meta: { permission: 'workers:view' },
        },
        {
          path: 'finance',
          name: 'finance',
          component: FinanceView,
          meta: { permission: 'finance:view' },
        },
        {
          path: 'dictionaries',
          name: 'dictionaries',
          component: DictionaryView,
          meta: { permission: 'dictionaries:view' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: SystemSettingsView,
          meta: { permission: 'settings:view' },
        },
        {
          path: 'menus',
          name: 'menus',
          component: MenuManagementView,
          meta: { permission: 'access.menus:view' },
        },
        {
          path: 'roles',
          name: 'roles',
          component: RoleManagementView,
          meta: { permission: 'access.roles:view' },
        },
        {
          path: 'admin-users',
          name: 'admin-users',
          component: AdminUsersView,
          meta: { permission: 'access.users:view' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

/**
 * 在进入目标路由前校验当前会话是否具备页面权限；若无权限，则回退到第一个可访问页面。
 *
 * @param {import('vue-router').RouteLocationNormalized} to 即将进入的目标路由。
 * @returns {true | string} 允许继续导航时返回 true，否则返回重定向路径。
 */
router.beforeEach((to) => {
  const requiredPermission = typeof to.meta.permission === 'string' ? to.meta.permission : undefined

  if (!requiredPermission || hasSessionPermission(requiredPermission)) {
    return true
  }

  return getFirstAccessibleRoute() ?? '/'
})

export default router