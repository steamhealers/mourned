import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from './views/AdminLayout.vue'
import DashboardView from './views/DashboardView.vue'
import FinanceView from './views/FinanceView.vue'
import OrdersView from './views/OrdersView.vue'
import ServicesView from './views/ServicesView.vue'
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
        },
        {
          path: 'services',
          name: 'services',
          component: ServicesView,
        },
        {
          path: 'orders',
          name: 'orders',
          component: OrdersView,
        },
        {
          path: 'workers',
          name: 'workers',
          component: WorkersView,
        },
        {
          path: 'finance',
          name: 'finance',
          component: FinanceView,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router