<script setup lang="ts">
import { Avatar, Coin, CollectionTag, DataBoard, List, Lock, Menu, Setting, Suitcase, UserFilled } from '@element-plus/icons-vue'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchAdminSession } from '../lib/api'
import NavigationMenuNode from '../components/admin/NavigationMenuNode.vue'
import { getFirstAccessibleRoute, useAdminAccess } from '../lib/access'
import { setCurrentAdminSession, useAdminSession } from '../lib/session'

const route = useRoute()
const router = useRouter()
const { adminSession, navigationMenus } = useAdminAccess()

const iconMap = {
  DataBoard,
  List,
  Suitcase,
  UserFilled,
  Coin,
  CollectionTag,
  Setting,
  Menu,
  Lock,
  Avatar,
}

const activeMenu = computed(() => route.path)

/**
 * 处理侧边菜单选择，并在目标为路由路径时执行页面跳转。
 *
 * @param {string} path 当前点击的菜单路径。
 * @returns {void}
 */
function handleSelect(path: string) {
  if (path.startsWith('/')) {
    router.push(path)
  }
}

/**
 * 拉取后台会话详情，并在权限或菜单变化后修正当前落点页面。
 *
 * @returns {Promise<void>} 会话同步完成后的 Promise。
 */
async function hydrateAdminSession() {
  try {
    const response = await fetchAdminSession()
    setCurrentAdminSession({
      ...response.item,
      authToken: adminSession.value.authToken,
    })

    const accessibleRoute = getFirstAccessibleRoute()
    if (accessibleRoute && accessibleRoute !== route.path && !adminSession.value.permissions.includes((navigationMenus.value.find(item => item.routePath === route.path)?.permissionCode ?? ''))) {
      router.replace(accessibleRoute)
    }
  }
  catch {
    // keep demo session when backend bootstrap endpoint is unavailable
  }
}

/**
 * 页面挂载后同步后台会话，必要时修正当前路由落点。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void hydrateAdminSession()
})
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-layout__sidebar">
      <div class="brand-block">
        <p class="brand-block__eyebrow">Mourned</p>
        <h1>后台管理</h1>
        <p>Element Plus 管理台，围绕服务、订单、代办员推进商用闭环。</p>
        <div class="brand-block__session">
          <el-tag size="small" effect="light">{{ adminSession.authMode }}</el-tag>
            <span>{{ adminSession.displayName }} / {{ adminSession.roleCodes.join('、') }}</span>
        </div>
      </div>

        <el-menu :default-active="activeMenu" class="admin-menu" @select="handleSelect">
          <NavigationMenuNode
            v-for="item in navigationMenus"
            :key="item.id"
            :item="item"
            :icon-map="iconMap"
          />
      </el-menu>
    </aside>

    <main class="admin-layout__content">
      <router-view />
    </main>
  </div>
</template>