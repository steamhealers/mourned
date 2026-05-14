import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { pool } from '../../lib/db'
import type {
  AdminAuthMode,
  AdminEntityStatus,
  AdminMenuType,
  CreateAdminMenuInput,
  CreateAdminRoleInput,
  CreateAdminUserInput,
} from './types'

interface AdminMenuRow extends RowDataPacket {
  id: number
  parent_id: number | null
  menu_type: AdminMenuType
  menu_key: string
  name: string
  route_path: string | null
  icon: string | null
  permission_code: string | null
  sort_order: number
  is_enabled: number
  created_at: string
  updated_at: string
}

interface AdminRoleRow extends RowDataPacket {
  id: number
  code: string
  name: string
  description: string | null
  status: AdminEntityStatus
  created_at: string
  updated_at: string
}

interface AdminUserRow extends RowDataPacket {
  id: number
  username: string
  display_name: string
  auth_mode: AdminAuthMode
  password_hint: string | null
  status: AdminEntityStatus
  created_at: string
  updated_at: string
}

interface RolePermissionRow extends RowDataPacket {
  role_id: number
  menu_id: number
}

interface UserRoleRow extends RowDataPacket {
  user_id: number
  role_id: number
}

interface AdminMenuTreeNode {
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
  children: AdminMenuTreeNode[]
}

/**
 * 将后台菜单行映射为树节点对象。
 *
 * @param {AdminMenuRow} row 菜单行数据。
 * @returns {AdminMenuTreeNode} 菜单树节点。
 */
function mapMenuRow(row: AdminMenuRow): AdminMenuTreeNode {
  return {
    id: row.id,
    parentId: row.parent_id,
    menuType: row.menu_type,
    menuKey: row.menu_key,
    name: row.name,
    routePath: row.route_path,
    icon: row.icon,
    permissionCode: row.permission_code,
    sortOrder: row.sort_order,
    isEnabled: row.is_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    children: [],
  }
}

/**
 * 根据父子关系递归构建后台菜单树。
 *
 * @param {AdminMenuRow[]} rows 菜单行集合。
 * @param {number | null} [parentId=null] 当前父节点 id。
 * @returns {AdminMenuTreeNode[]} 菜单树。
 */
function buildMenuTree(rows: AdminMenuRow[], parentId: number | null = null): AdminMenuTreeNode[] {
  return rows
    .filter(row => row.parent_id === parentId)
    .map(row => ({
      ...mapMenuRow(row),
      children: buildMenuTree(rows, row.id),
    }))
}

/**
 * 将授予的菜单 id 扩展为包含所有祖先节点的集合，保证前端菜单树可完整展开。
 *
 * @param {AdminMenuRow[]} rows 菜单行集合。
 * @param {Set<number>} menuIds 已授予的菜单 id 集合。
 * @returns {Set<number>} 包含祖先节点的菜单 id 集合。
 */
function collectAncestorIds(rows: AdminMenuRow[], menuIds: Set<number>) {
  const rowMap = new Map(rows.map(row => [row.id, row]))
  const expandedIds = new Set(menuIds)

  for (const id of menuIds) {
    let current = rowMap.get(id)

    while (current?.parent_id) {
      expandedIds.add(current.parent_id)
      current = rowMap.get(current.parent_id)
    }
  }

  return expandedIds
}

/**
 * 查询全部后台菜单行。
 *
 * @returns {Promise<AdminMenuRow[]>} 菜单行列表。
 */
async function listMenuRows() {
  const [rows] = await pool.query<AdminMenuRow[]>(
    `
      SELECT id, parent_id, menu_type, menu_key, name, route_path, icon, permission_code, sort_order, is_enabled, created_at, updated_at
      FROM admin_menus
      ORDER BY sort_order ASC, id ASC
    `,
  )

  return rows
}

/**
 * 查询全部后台角色行。
 *
 * @returns {Promise<AdminRoleRow[]>} 角色行列表。
 */
async function listRoleRows() {
  const [rows] = await pool.query<AdminRoleRow[]>(
    `
      SELECT id, code, name, description, status, created_at, updated_at
      FROM admin_roles
      ORDER BY created_at ASC, id ASC
    `,
  )

  return rows
}

/**
 * 查询全部后台用户行。
 *
 * @returns {Promise<AdminUserRow[]>} 用户行列表。
 */
async function listUserRows() {
  const [rows] = await pool.query<AdminUserRow[]>(
    `
      SELECT id, username, display_name, auth_mode, password_hint, status, created_at, updated_at
      FROM admin_users
      ORDER BY created_at ASC, id ASC
    `,
  )

  return rows
}

/**
 * 查询角色与菜单权限关系表。
 *
 * @returns {Promise<RolePermissionRow[]>} 角色权限关系列表。
 */
async function listRolePermissionRows() {
  const [rows] = await pool.query<RolePermissionRow[]>(
    'SELECT role_id, menu_id FROM admin_role_menu_permissions ORDER BY role_id ASC, menu_id ASC',
  )

  return rows
}

/**
 * 查询用户与角色关系表。
 *
 * @returns {Promise<UserRoleRow[]>} 用户角色关系列表。
 */
async function listUserRoleRows() {
  const [rows] = await pool.query<UserRoleRow[]>(
    'SELECT user_id, role_id FROM admin_user_roles ORDER BY user_id ASC, role_id ASC',
  )

  return rows
}

/**
 * 按 id 查询后台用户。
 *
 * @param {number} userId 用户 id。
 * @returns {Promise<AdminUserRow | null>} 命中的用户行或空值。
 */
async function getAdminUserById(userId: number) {
  const [rows] = await pool.query<AdminUserRow[]>(
    `
      SELECT id, username, display_name, auth_mode, password_hint, status, created_at, updated_at
      FROM admin_users
      WHERE id = :userId
      LIMIT 1
    `,
    { userId },
  )

  return rows[0] ?? null
}

/**
 * 按 id 查询后台角色。
 *
 * @param {number} roleId 角色 id。
 * @returns {Promise<AdminRoleRow | null>} 命中的角色行或空值。
 */
async function getAdminRoleById(roleId: number) {
  const [rows] = await pool.query<AdminRoleRow[]>(
    `
      SELECT id, code, name, description, status, created_at, updated_at
      FROM admin_roles
      WHERE id = :roleId
      LIMIT 1
    `,
    { roleId },
  )

  return rows[0] ?? null
}

/**
 * 按 id 查询后台菜单。
 *
 * @param {number} menuId 菜单 id。
 * @returns {Promise<AdminMenuRow | null>} 命中的菜单行或空值。
 */
async function getAdminMenuById(menuId: number) {
  const [rows] = await pool.query<AdminMenuRow[]>(
    `
      SELECT id, parent_id, menu_type, menu_key, name, route_path, icon, permission_code, sort_order, is_enabled, created_at, updated_at
      FROM admin_menus
      WHERE id = :menuId
      LIMIT 1
    `,
    { menuId },
  )

  return rows[0] ?? null
}

/**
 * 重置并同步角色绑定的菜单权限。
 *
 * @param {number} roleId 角色 id。
 * @param {number[]} permissionIds 菜单权限 id 列表。
 * @returns {Promise<void>} 同步完成后的 Promise。
 */
async function syncRolePermissions(roleId: number, permissionIds: number[]) {
  await pool.query('DELETE FROM admin_role_menu_permissions WHERE role_id = :roleId', { roleId })

  for (const menuId of permissionIds) {
    await pool.query(
      'INSERT INTO admin_role_menu_permissions (role_id, menu_id) VALUES (:roleId, :menuId)',
      { roleId, menuId },
    )
  }
}

/**
 * 重置并同步用户绑定的角色列表。
 *
 * @param {number} userId 用户 id。
 * @param {number[]} roleIds 角色 id 列表。
 * @returns {Promise<void>} 同步完成后的 Promise。
 */
async function syncUserRoles(userId: number, roleIds: number[]) {
  await pool.query('DELETE FROM admin_user_roles WHERE user_id = :userId', { userId })

  for (const roleId of roleIds) {
    await pool.query(
      'INSERT INTO admin_user_roles (user_id, role_id) VALUES (:userId, :roleId)',
      { userId, roleId },
    )
  }
}

/**
 * 获取后台菜单树。
 *
 * @returns {Promise<AdminMenuTreeNode[]>} 菜单树。
 */
export async function listAdminMenus() {
  const rows = await listMenuRows()
  return buildMenuTree(rows)
}

/**
 * 创建后台菜单并返回详情。
 *
 * @param {CreateAdminMenuInput} input 菜单创建输入。
 * @returns {Promise<AdminMenuRow | null>} 新建后的菜单行。
 */
export async function createAdminMenu(input: CreateAdminMenuInput) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO admin_menus (parent_id, menu_type, menu_key, name, route_path, icon, permission_code, sort_order, is_enabled)
      VALUES (:parentId, :menuType, :menuKey, :name, :routePath, :icon, :permissionCode, :sortOrder, :isEnabled)
    `,
    {
      parentId: input.parentId ?? null,
      menuType: input.menuType,
      menuKey: input.menuKey,
      name: input.name,
      routePath: input.routePath ?? null,
      icon: input.icon ?? null,
      permissionCode: input.permissionCode ?? null,
      sortOrder: input.sortOrder,
      isEnabled: input.isEnabled ? 1 : 0,
    },
  )

  return getAdminMenuById(Number(result.insertId))
}

/**
 * 更新后台菜单并返回详情。
 *
 * @param {number} menuId 菜单 id。
 * @param {CreateAdminMenuInput} input 菜单更新输入。
 * @returns {Promise<AdminMenuRow | null>} 更新后的菜单行。
 */
export async function updateAdminMenu(menuId: number, input: CreateAdminMenuInput) {
  await pool.query(
    `
      UPDATE admin_menus
      SET parent_id = :parentId,
          menu_type = :menuType,
          menu_key = :menuKey,
          name = :name,
          route_path = :routePath,
          icon = :icon,
          permission_code = :permissionCode,
          sort_order = :sortOrder,
          is_enabled = :isEnabled
      WHERE id = :menuId
    `,
    {
      menuId,
      parentId: input.parentId ?? null,
      menuType: input.menuType,
      menuKey: input.menuKey,
      name: input.name,
      routePath: input.routePath ?? null,
      icon: input.icon ?? null,
      permissionCode: input.permissionCode ?? null,
      sortOrder: input.sortOrder,
      isEnabled: input.isEnabled ? 1 : 0,
    },
  )

  return getAdminMenuById(menuId)
}

/**
 * 删除指定后台菜单。
 *
 * @param {number} menuId 菜单 id。
 * @returns {Promise<boolean>} 为 true 表示删除成功。
 */
export async function deleteAdminMenu(menuId: number) {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM admin_menus WHERE id = :menuId',
    { menuId },
  )

  return result.affectedRows > 0
}

/**
 * 获取后台角色列表，并附带权限码与用户数量统计。
 *
 * @returns {Promise<Array<{ id: number, code: string, name: string, description: string | null, status: AdminEntityStatus, permissionIds: number[], permissionCodes: string[], userCount: number, createdAt: string, updatedAt: string }>>} 角色列表。
 */
export async function listAdminRoles() {
  const [roles, menus, permissions, userRoles] = await Promise.all([
    listRoleRows(),
    listMenuRows(),
    listRolePermissionRows(),
    listUserRoleRows(),
  ])

  return roles.map((role) => {
    const permissionIds = permissions.filter(item => item.role_id === role.id).map(item => item.menu_id)
    const permissionCodeSet = new Set(
      menus
        .filter(item => permissionIds.includes(item.id) && item.permission_code)
        .map(item => item.permission_code as string),
    )

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      status: role.status,
      permissionIds,
      permissionCodes: Array.from(permissionCodeSet),
      userCount: userRoles.filter(item => item.role_id === role.id).length,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    }
  })
}

/**
 * 创建后台角色并同步其权限。
 *
 * @param {CreateAdminRoleInput} input 角色创建输入。
 * @returns {Promise<AdminRoleRow | null>} 新建后的角色行。
 */
export async function createAdminRole(input: CreateAdminRoleInput) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO admin_roles (code, name, description, status)
      VALUES (:code, :name, :description, :status)
    `,
    {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
    },
  )

  const roleId = Number(result.insertId)
  await syncRolePermissions(roleId, input.permissionIds)
  return getAdminRoleById(roleId)
}

/**
 * 更新后台角色并同步其权限。
 *
 * @param {number} roleId 角色 id。
 * @param {CreateAdminRoleInput} input 角色更新输入。
 * @returns {Promise<AdminRoleRow | null>} 更新后的角色行。
 */
export async function updateAdminRole(roleId: number, input: CreateAdminRoleInput) {
  await pool.query(
    `
      UPDATE admin_roles
      SET code = :code,
          name = :name,
          description = :description,
          status = :status
      WHERE id = :roleId
    `,
    {
      roleId,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
    },
  )

  await syncRolePermissions(roleId, input.permissionIds)
  return getAdminRoleById(roleId)
}

/**
 * 删除指定后台角色。
 *
 * @param {number} roleId 角色 id。
 * @returns {Promise<boolean>} 为 true 表示删除成功。
 */
export async function deleteAdminRole(roleId: number) {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM admin_roles WHERE id = :roleId',
    { roleId },
  )

  return result.affectedRows > 0
}

/**
 * 获取后台用户列表，并附带角色信息。
 *
 * @returns {Promise<Array<{ id: number, username: string, displayName: string, authMode: AdminAuthMode, passwordHint: string | null, status: AdminEntityStatus, roleIds: number[], roles: Array<{ id: number, code: string, name: string, status: AdminEntityStatus }>, createdAt: string, updatedAt: string }>>} 用户列表。
 */
export async function listAdminUsers() {
  const [users, roles, userRoles] = await Promise.all([
    listUserRows(),
    listRoleRows(),
    listUserRoleRows(),
  ])

  return users.map((user) => {
    const assignedRoleIds = userRoles.filter(item => item.user_id === user.id).map(item => item.role_id)
    const assignedRoles = roles
      .filter(role => assignedRoleIds.includes(role.id))
      .map(role => ({
        id: role.id,
        code: role.code,
        name: role.name,
        status: role.status,
      }))

    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      authMode: user.auth_mode,
      passwordHint: user.password_hint,
      status: user.status,
      roleIds: assignedRoleIds,
      roles: assignedRoles,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }
  })
}

/**
 * 创建后台用户并同步其角色绑定。
 *
 * @param {CreateAdminUserInput} input 用户创建输入。
 * @returns {Promise<AdminUserRow | null>} 新建后的用户行。
 */
export async function createAdminUser(input: CreateAdminUserInput) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO admin_users (username, display_name, auth_mode, password_hint, status)
      VALUES (:username, :displayName, :authMode, :passwordHint, :status)
    `,
    {
      username: input.username,
      displayName: input.displayName,
      authMode: input.authMode,
      passwordHint: input.passwordHint ?? null,
      status: input.status,
    },
  )

  const userId = Number(result.insertId)
  await syncUserRoles(userId, input.roleIds)
  return getAdminUserById(userId)
}

/**
 * 更新后台用户并同步其角色绑定。
 *
 * @param {number} userId 用户 id。
 * @param {CreateAdminUserInput} input 用户更新输入。
 * @returns {Promise<AdminUserRow | null>} 更新后的用户行。
 */
export async function updateAdminUser(userId: number, input: CreateAdminUserInput) {
  await pool.query(
    `
      UPDATE admin_users
      SET username = :username,
          display_name = :displayName,
          auth_mode = :authMode,
          password_hint = :passwordHint,
          status = :status
      WHERE id = :userId
    `,
    {
      userId,
      username: input.username,
      displayName: input.displayName,
      authMode: input.authMode,
      passwordHint: input.passwordHint ?? null,
      status: input.status,
    },
  )

  await syncUserRoles(userId, input.roleIds)
  return getAdminUserById(userId)
}

/**
 * 删除指定后台用户。
 *
 * @param {number} userId 用户 id。
 * @returns {Promise<boolean>} 为 true 表示删除成功。
 */
export async function deleteAdminUser(userId: number) {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM admin_users WHERE id = :userId',
    { userId },
  )

  return result.affectedRows > 0
}

/**
 * 组装后台当前登录用户的会话、角色、权限码与菜单树。
 *
 * @param {string} [adminId='admin-demo-001'] 后台用户名。
 * @returns {Promise<{ authMode: AdminAuthMode | 'demo', adminId: string, userId: number, username: string, displayName: string, roleCode: string, roleCodes: string[], permissions: string[], menus: AdminMenuTreeNode[] }>} 后台会话数据。
 */
export async function getAdminSessionProfile(adminId = 'admin-demo-001') {
  const [users, roles, menus, permissions, userRoles] = await Promise.all([
    pool.query<AdminUserRow[]>(
      `
        SELECT id, username, display_name, auth_mode, password_hint, status, created_at, updated_at
        FROM admin_users
        WHERE username = :adminId
        LIMIT 1
      `,
      { adminId },
    ),
    listRoleRows(),
    listMenuRows(),
    listRolePermissionRows(),
    listUserRoleRows(),
  ])

  const user = users[0][0]

  if (!user) {
    return {
      authMode: 'demo' as const,
      adminId,
      userId: 0,
      username: adminId,
      displayName: '演示管理员',
      roleCode: 'super-admin',
      roleCodes: ['super-admin'],
      permissions: [],
      menus: [],
    }
  }

  const assignedRoleIds = userRoles.filter(item => item.user_id === user.id).map(item => item.role_id)
  const assignedRoles = roles.filter(role => assignedRoleIds.includes(role.id))
  const grantedMenuIds = new Set(
    permissions
      .filter(item => assignedRoleIds.includes(item.role_id))
      .map(item => item.menu_id),
  )
  const expandedMenuIds = collectAncestorIds(menus, grantedMenuIds)
  const grantedMenus = menus.filter(item => expandedMenuIds.has(item.id) && item.is_enabled === 1)
  const permissionCodes = Array.from(
    new Set(
      grantedMenus
        .filter(item => item.permission_code)
        .map(item => item.permission_code as string),
    ),
  )

  return {
    authMode: user.auth_mode,
    adminId: user.username,
    userId: user.id,
    username: user.username,
    displayName: user.display_name,
    roleCode: assignedRoles[0]?.code ?? 'no-role',
    roleCodes: assignedRoles.map(role => role.code),
    permissions: permissionCodes,
    menus: buildMenuTree(grantedMenus),
  }
}