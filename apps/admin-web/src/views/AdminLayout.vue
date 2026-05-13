<script setup lang="ts">
import { Coin, DataBoard, List, Suitcase, UserFilled } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const navItems = [
  { index: '/', label: '概览', icon: DataBoard },
  { index: '/services', label: '服务管理', icon: List },
  { index: '/orders', label: '订单管理', icon: Suitcase },
  { index: '/workers', label: '代办员管理', icon: UserFilled },
  { index: '/finance', label: '财务结算', icon: Coin },
]

function handleSelect(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-layout__sidebar">
      <div class="brand-block">
        <p class="brand-block__eyebrow">Mourned</p>
        <h1>后台管理</h1>
        <p>Element Plus 管理台，围绕服务、订单、代办员推进商用闭环。</p>
      </div>

      <el-menu :default-active="route.path" class="admin-menu" @select="handleSelect">
        <el-menu-item v-for="item in navItems" :key="item.index" :index="item.index">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <main class="admin-layout__content">
      <router-view />
    </main>
  </div>
</template>