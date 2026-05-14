import { computed } from 'vue'
import { getCurrentAdminSession, useAdminSession } from './session'
import type { AdminMenuNode } from './access-model'

/**
 * 递归过滤出可导航的菜单节点，去掉禁用项和按钮型节点。
 *
 * @param {readonly AdminMenuNode[]} items 原始菜单树。
 * @returns {AdminMenuNode[]} 仅包含可导航节点的新菜单树。
 */
function filterNavigableMenus(items: readonly AdminMenuNode[]): AdminMenuNode[] {
  return items
    .filter(item => item.isEnabled && item.menuType !== 'button')
    .map(item => ({
      ...item,
      children: filterNavigableMenus(item.children),
    }))
}

/**
 * 从菜单树中寻找第一个可访问的路由地址。
 *
 * @param {readonly AdminMenuNode[]} items 当前待遍历的菜单节点。
 * @returns {string | null} 找到的首个路由地址；不存在时返回空值。
 */
function findFirstRoute(items: readonly AdminMenuNode[]): string | null {
  for (const item of items) {
    if (item.isEnabled && item.menuType !== 'button' && item.routePath) {
      return item.routePath
    }

    const childRoute = findFirstRoute(item.children)
    if (childRoute) {
      return childRoute
    }
  }

  return null
}

/**
 * 基于当前持久化会话判断是否具备指定权限。
 *
 * @param {string | null | undefined} permissionCode 待校验的权限码。
 * @returns {boolean} 为 true 表示允许访问。
 */
export function hasSessionPermission(permissionCode?: string | null) {
  if (!permissionCode) {
    return true
  }

  return getCurrentAdminSession().permissions.includes(permissionCode)
}

/**
 * 返回当前会话下首个可访问的后台页面路由。
 *
 * @returns {string | null} 首个可访问路由；不存在时返回空值。
 */
export function getFirstAccessibleRoute() {
  return findFirstRoute(filterNavigableMenus(getCurrentAdminSession().menus))
}

/**
 * 提供后台会话、导航菜单与按钮权限判断能力。
 *
 * @returns {{ adminSession: ReturnType<typeof useAdminSession>, navigationMenus: import('vue').ComputedRef<AdminMenuNode[]>, hasPermission: (permissionCode?: string | null) => boolean }} 权限访问辅助对象。
 */
export function useAdminAccess() {
  const adminSession = useAdminSession()

  const navigationMenus = computed(() => filterNavigableMenus(adminSession.value.menus))

  /**
   * 判断当前响应式会话是否具备指定权限。
   *
   * @param {string | null | undefined} permissionCode 待校验的权限码。
   * @returns {boolean} 为 true 表示允许访问。
   */
  function hasPermission(permissionCode?: string | null) {
    if (!permissionCode) {
      return true
    }

    return adminSession.value.permissions.includes(permissionCode)
  }

  return {
    adminSession,
    navigationMenus,
    hasPermission,
  }
}