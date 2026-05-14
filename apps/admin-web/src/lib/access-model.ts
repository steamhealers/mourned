export type AdminAuthMode = 'demo' | 'password' | 'wechat-work'
export type AdminEntityStatus = 'active' | 'inactive'
export type AdminMenuType = 'catalog' | 'menu' | 'button'

export interface AdminMenuNode {
  id: number
  parentId: number | null
  menuType: AdminMenuType
  menuKey: string
  name: string
  routePath: string | null
  icon: string | null
  permissionCode: string | null
  sortOrder: number
  isEnabled: boolean
  createdAt: string
  updatedAt: string
  children: readonly AdminMenuNode[]
}

export interface AdminSession {
  authMode: AdminAuthMode
  adminId: string
  userId: number
  username: string
  displayName: string
  roleCode: string
  roleCodes: string[]
  permissions: string[]
  menus: AdminMenuNode[]
  authToken?: string
}

const now = '2026-05-14T00:00:00.000Z'

export const fallbackAdminMenus: AdminMenuNode[] = [
  { id: 1, parentId: null, menuType: 'menu', menuKey: 'dashboard', name: '概览', routePath: '/', icon: 'DataBoard', permissionCode: 'dashboard:view', sortOrder: 10, isEnabled: true, createdAt: now, updatedAt: now, children: [
    { id: 11, parentId: 1, menuType: 'button', menuKey: 'dashboard-jump-orders', name: '概览跳转订单', routePath: null, icon: null, permissionCode: 'dashboard.jump.orders', sortOrder: 110, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 12, parentId: 1, menuType: 'button', menuKey: 'dashboard-jump-workers', name: '概览跳转代办员', routePath: null, icon: null, permissionCode: 'dashboard.jump.workers', sortOrder: 120, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 13, parentId: 1, menuType: 'button', menuKey: 'dashboard-jump-finance', name: '概览跳转财务', routePath: null, icon: null, permissionCode: 'dashboard.jump.finance', sortOrder: 130, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
  ] },
  { id: 2, parentId: null, menuType: 'menu', menuKey: 'services', name: '服务管理', routePath: '/services', icon: 'List', permissionCode: 'services:view', sortOrder: 20, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
  { id: 3, parentId: null, menuType: 'menu', menuKey: 'orders', name: '订单管理', routePath: '/orders', icon: 'Suitcase', permissionCode: 'orders:view', sortOrder: 30, isEnabled: true, createdAt: now, updatedAt: now, children: [
    { id: 14, parentId: 3, menuType: 'button', menuKey: 'orders-open-detail', name: '查看订单详情', routePath: null, icon: null, permissionCode: 'orders.detail', sortOrder: 140, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 15, parentId: 3, menuType: 'button', menuKey: 'orders-submit-quote', name: '提交报价', routePath: null, icon: null, permissionCode: 'orders.quote', sortOrder: 150, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 16, parentId: 3, menuType: 'button', menuKey: 'orders-dispatch', name: '派单', routePath: null, icon: null, permissionCode: 'orders.dispatch', sortOrder: 160, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 17, parentId: 3, menuType: 'button', menuKey: 'orders-payment-callback', name: '模拟支付回调', routePath: null, icon: null, permissionCode: 'orders.payment-callback', sortOrder: 170, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 18, parentId: 3, menuType: 'button', menuKey: 'orders-refund-review', name: '退款审核', routePath: null, icon: null, permissionCode: 'orders.refund-review', sortOrder: 180, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 19, parentId: 3, menuType: 'button', menuKey: 'orders-force-complete', name: '强制完结', routePath: null, icon: null, permissionCode: 'orders.force-complete', sortOrder: 190, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
  ] },
  { id: 4, parentId: null, menuType: 'menu', menuKey: 'workers', name: '代办员管理', routePath: '/workers', icon: 'UserFilled', permissionCode: 'workers:view', sortOrder: 40, isEnabled: true, createdAt: now, updatedAt: now, children: [
    { id: 42, parentId: 4, menuType: 'button', menuKey: 'workers-create', name: '新建代办员', routePath: null, icon: null, permissionCode: 'workers.create', sortOrder: 195, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 20, parentId: 4, menuType: 'button', menuKey: 'workers-approve', name: '代办员通过审核', routePath: null, icon: null, permissionCode: 'workers.approve', sortOrder: 200, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 21, parentId: 4, menuType: 'button', menuKey: 'workers-pending', name: '代办员转待审核', routePath: null, icon: null, permissionCode: 'workers.pending', sortOrder: 210, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 22, parentId: 4, menuType: 'button', menuKey: 'workers-freeze', name: '代办员冻结', routePath: null, icon: null, permissionCode: 'workers.freeze', sortOrder: 220, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 23, parentId: 4, menuType: 'button', menuKey: 'workers-settlement', name: '生成结算', routePath: null, icon: null, permissionCode: 'workers.settlement', sortOrder: 230, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
  ] },
  { id: 5, parentId: null, menuType: 'menu', menuKey: 'finance', name: '财务结算', routePath: '/finance', icon: 'Coin', permissionCode: 'finance:view', sortOrder: 50, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
  { id: 6, parentId: null, menuType: 'menu', menuKey: 'dictionaries', name: '字典管理', routePath: '/dictionaries', icon: 'CollectionTag', permissionCode: 'dictionaries:view', sortOrder: 60, isEnabled: true, createdAt: now, updatedAt: now, children: [
    { id: 24, parentId: 6, menuType: 'button', menuKey: 'dictionaries-create', name: '新建字典', routePath: null, icon: null, permissionCode: 'dictionaries.create', sortOrder: 240, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 25, parentId: 6, menuType: 'button', menuKey: 'dictionaries-edit', name: '编辑字典', routePath: null, icon: null, permissionCode: 'dictionaries.edit', sortOrder: 250, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 26, parentId: 6, menuType: 'button', menuKey: 'dictionaries-delete', name: '删除字典', routePath: null, icon: null, permissionCode: 'dictionaries.delete', sortOrder: 260, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 27, parentId: 6, menuType: 'button', menuKey: 'dictionaries-item-create', name: '新增字典节点', routePath: null, icon: null, permissionCode: 'dictionaries.item.create', sortOrder: 270, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 28, parentId: 6, menuType: 'button', menuKey: 'dictionaries-item-edit', name: '编辑字典节点', routePath: null, icon: null, permissionCode: 'dictionaries.item.edit', sortOrder: 280, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 29, parentId: 6, menuType: 'button', menuKey: 'dictionaries-item-delete', name: '删除字典节点', routePath: null, icon: null, permissionCode: 'dictionaries.item.delete', sortOrder: 290, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
  ] },
  { id: 7, parentId: null, menuType: 'menu', menuKey: 'settings', name: '参数设置', routePath: '/settings', icon: 'Setting', permissionCode: 'settings:view', sortOrder: 70, isEnabled: true, createdAt: now, updatedAt: now, children: [
    { id: 30, parentId: 7, menuType: 'button', menuKey: 'settings-create', name: '新建参数', routePath: null, icon: null, permissionCode: 'settings.create', sortOrder: 300, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 31, parentId: 7, menuType: 'button', menuKey: 'settings-edit', name: '编辑参数', routePath: null, icon: null, permissionCode: 'settings.edit', sortOrder: 310, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 32, parentId: 7, menuType: 'button', menuKey: 'settings-delete', name: '删除参数', routePath: null, icon: null, permissionCode: 'settings.delete', sortOrder: 320, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
  ] },
  { id: 8, parentId: null, menuType: 'menu', menuKey: 'menu-management', name: '菜单管理', routePath: '/menus', icon: 'Menu', permissionCode: 'access.menus:view', sortOrder: 80, isEnabled: true, createdAt: now, updatedAt: now, children: [
    { id: 33, parentId: 8, menuType: 'button', menuKey: 'menus-create', name: '新建菜单', routePath: null, icon: null, permissionCode: 'access.menus.create', sortOrder: 330, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 34, parentId: 8, menuType: 'button', menuKey: 'menus-edit', name: '编辑菜单', routePath: null, icon: null, permissionCode: 'access.menus.edit', sortOrder: 340, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 35, parentId: 8, menuType: 'button', menuKey: 'menus-delete', name: '删除菜单', routePath: null, icon: null, permissionCode: 'access.menus.delete', sortOrder: 350, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
  ] },
  { id: 9, parentId: null, menuType: 'menu', menuKey: 'role-management', name: '角色权限', routePath: '/roles', icon: 'Lock', permissionCode: 'access.roles:view', sortOrder: 90, isEnabled: true, createdAt: now, updatedAt: now, children: [
    { id: 36, parentId: 9, menuType: 'button', menuKey: 'roles-create', name: '新建角色', routePath: null, icon: null, permissionCode: 'access.roles.create', sortOrder: 360, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 37, parentId: 9, menuType: 'button', menuKey: 'roles-edit', name: '编辑角色', routePath: null, icon: null, permissionCode: 'access.roles.edit', sortOrder: 370, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 38, parentId: 9, menuType: 'button', menuKey: 'roles-delete', name: '删除角色', routePath: null, icon: null, permissionCode: 'access.roles.delete', sortOrder: 380, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
  ] },
  { id: 10, parentId: null, menuType: 'menu', menuKey: 'admin-users', name: '用户管理', routePath: '/admin-users', icon: 'Avatar', permissionCode: 'access.users:view', sortOrder: 100, isEnabled: true, createdAt: now, updatedAt: now, children: [
    { id: 39, parentId: 10, menuType: 'button', menuKey: 'users-create', name: '新建用户', routePath: null, icon: null, permissionCode: 'access.users.create', sortOrder: 390, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 40, parentId: 10, menuType: 'button', menuKey: 'users-edit', name: '编辑用户', routePath: null, icon: null, permissionCode: 'access.users.edit', sortOrder: 400, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
    { id: 41, parentId: 10, menuType: 'button', menuKey: 'users-delete', name: '删除用户', routePath: null, icon: null, permissionCode: 'access.users.delete', sortOrder: 410, isEnabled: true, createdAt: now, updatedAt: now, children: [] },
  ] },
]

export const fallbackAdminSession: AdminSession = {
  authMode: 'demo',
  adminId: 'admin-demo-001',
  userId: 1,
  username: 'admin-demo-001',
  displayName: '演示管理员',
  roleCode: 'super-admin',
  roleCodes: ['super-admin'],
  permissions: [
    'dashboard:view', 'dashboard.jump.orders', 'dashboard.jump.workers', 'dashboard.jump.finance',
    'services:view', 'orders:view', 'orders.detail', 'orders.quote', 'orders.dispatch', 'orders.payment-callback', 'orders.refund-review', 'orders.force-complete',
    'workers:view', 'workers.create', 'workers.approve', 'workers.pending', 'workers.freeze', 'workers.settlement',
    'finance:view', 'dictionaries:view', 'dictionaries.create', 'dictionaries.edit', 'dictionaries.delete', 'dictionaries.item.create', 'dictionaries.item.edit', 'dictionaries.item.delete',
    'settings:view', 'settings.create', 'settings.edit', 'settings.delete',
    'access.menus:view', 'access.menus.create', 'access.menus.edit', 'access.menus.delete',
    'access.roles:view', 'access.roles.create', 'access.roles.edit', 'access.roles.delete',
    'access.users:view', 'access.users.create', 'access.users.edit', 'access.users.delete',
  ],
  menus: fallbackAdminMenus,
}