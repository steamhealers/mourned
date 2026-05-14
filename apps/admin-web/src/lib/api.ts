import { decryptSensitiveFields, encryptSensitiveFields, type OrderStatus, type RefundStatus } from '@mourned/domain'
import type { AdminAuthMode, AdminEntityStatus, AdminMenuNode, AdminMenuType } from './access-model'
import { apiBaseUrl, sm4Secret } from './config'
import { buildAuthenticatedAdminHeaders } from './session'

const API_BASE_URL = apiBaseUrl

export type AdminScope = 'shared' | 'user-miniapp' | 'worker-miniapp' | 'admin-web' | 'api'
export type DictionaryStatus = 'active' | 'inactive'
export type SettingValueType = 'string' | 'number' | 'boolean' | 'json'

/**
 * 统一执行后台管理端 API 请求，负责敏感字段加密、签名头拼装与响应解密。
 *
 * @template T 响应数据类型。
 * @param {string} path 相对 API 路径。
 * @param {RequestInit} [init] 可选的 fetch 初始化配置。
 * @returns {Promise<T>} 解析并解密后的响应数据。
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const rawBody = init?.body && typeof init.body === 'string'
    ? JSON.parse(init.body) as Record<string, unknown>
    : undefined
  const encryptedBody = rawBody ? encryptSensitiveFields(rawBody, sm4Secret) as Record<string, unknown> : undefined
  const signatureData = init?.method && init.method !== 'GET'
    ? (encryptedBody ?? {})
    : Object.fromEntries(new URLSearchParams(path.split('?')[1] ?? '').entries())

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(await buildAuthenticatedAdminHeaders(signatureData)),
      ...(init?.headers ?? {}),
    },
    ...init,
    body: encryptedBody ? JSON.stringify(encryptedBody) : init?.body,
  })

  if (!response.ok) {
    throw new Error(`API_REQUEST_FAILED:${response.status}`)
  }

  const payload = await response.json() as T
  return decryptSensitiveFields(payload, sm4Secret)
}

export interface ServiceItemDto {
  id: number
  code: string
  name: string
  tradeMode: 'direct' | 'quote' | 'review'
  deliveryMode: 'onsite' | 'remote' | 'hybrid'
  description: string
}

export interface OrderDto {
  id: number
  orderNo: string
  serviceName: string
  serviceCode: string
  workerName: string | null
  city: string
  district: string
  contactName: string
  contactPhone: string
  scheduledAt: string
  amount: number
  status: OrderStatus
  refundStatus: RefundStatus
  notes: string | null
  createdAt: string
  quotes?: QuoteDto[]
  fulfillmentRecords?: FulfillmentRecordDto[]
}

export interface QuoteDto {
  id: number
  quotedBy: string
  amount: number
  detail: Array<{ label: string, value: string }>
  expiresAt: string
  status: string
  createdAt: string
}

export interface FulfillmentRecordDto {
  id: number
  stageCode: string
  mediaUrl: string | null
  latitude: number | null
  longitude: number | null
  description: string | null
  createdAt: string
}

export interface WorkerDto {
  id: number
  realName: string
  phone: string | null
  serviceArea: string
  serviceTags: string[]
  rating: number
  completedOrderCount: number
  status: 'pending' | 'active' | 'frozen'
  createdAt: string
}

export interface CreateWorkerPayload {
  openId: string
  phone: string
  realName: string
  serviceArea: string
  serviceTags: string[]
}

export interface PaymentRecordDto {
  id: number
  orderId: number
  orderNo: string
  channel: string
  transactionNo: string
  amount: number
  status: string
  paidAt: string
  createdAt: string
}

export interface RefundRecordDto {
  id: number
  orderId: number
  orderNo: string
  reason: string
  evidenceUrls: string[]
  status: string
  reviewNote: string | null
  createdAt: string
  updatedAt: string
}

export interface SettlementDto {
  id: number
  workerProfileId: number
  workerName: string
  periodLabel: string
  grossAmount: number
  commissionRate: number
  netAmount: number
  status: string
  note: string | null
  createdAt: string
}

export interface FinanceOverviewDto {
  metrics: {
    paidCount: number
    pendingRefundCount: number
    pendingSettlementCount: number
    paidAmountTotal: number
  }
  paymentRecords: PaymentRecordDto[]
  refundRecords: RefundRecordDto[]
  settlements: SettlementDto[]
}

export interface AdminSessionDto {
  authMode: AdminAuthMode
  adminId: string
  userId: number
  username: string
  displayName: string
  roleCode: string
  roleCodes: string[]
  permissions: string[]
  menus: AdminMenuDto[]
}

export interface AdminMenuDto extends AdminMenuNode {}

export interface AdminRoleDto {
  id: number
  code: string
  name: string
  description: string | null
  status: AdminEntityStatus
  permissionIds: number[]
  permissionCodes: string[]
  userCount: number
  createdAt: string
  updatedAt: string
}

export interface AdminUserRoleDto {
  id: number
  code: string
  name: string
  status: AdminEntityStatus
}

export interface AdminUserDto {
  id: number
  username: string
  displayName: string
  authMode: AdminAuthMode
  passwordHint: string | null
  status: AdminEntityStatus
  roleIds: number[]
  roles: AdminUserRoleDto[]
  createdAt: string
  updatedAt: string
}

export interface DictionaryItemDto {
  id: number
  parentId: number | null
  itemKey: string
  label: string
  value: string
  sortOrder: number
  isEnabled: boolean
  extraJson: unknown | null
  createdAt: string
  updatedAt: string
  children: DictionaryItemDto[]
}

export interface DictionaryDto {
  id: number
  code: string
  name: string
  scope: AdminScope
  description: string | null
  status: DictionaryStatus
  itemCount: number
  createdAt: string
  updatedAt: string
  items: DictionaryItemDto[]
}

export interface SystemSettingDto {
  id: number
  scope: AdminScope
  groupCode: string
  settingKey: string
  name: string
  valueType: SettingValueType
  valueText: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface PublicSystemSettingDto {
  id: number
  scope: AdminScope
  groupCode: string
  settingKey: string
  name: string
  valueType: SettingValueType
  valueText: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 获取服务目录列表。
 *
 * @returns {Promise<{ items: ServiceItemDto[] }>} 服务列表响应。
 */
export async function fetchServices() {
  return request<{ items: ServiceItemDto[] }>('/services')
}

/**
 * 获取当前后台登录会话和菜单权限数据。
 *
 * @returns {Promise<{ item: AdminSessionDto }>} 后台会话详情。
 */
export async function fetchAdminSession() {
  return request<{ item: AdminSessionDto }>('/admin/session')
}

/**
 * 获取后台菜单树。
 *
 * @returns {Promise<{ items: AdminMenuDto[] }>} 菜单列表响应。
 */
export async function fetchAdminMenus() {
  return request<{ items: AdminMenuDto[] }>('/admin/menus')
}

/**
 * 创建后台菜单或按钮权限节点。
 *
 * @param {{ parentId?: number | null, menuType: AdminMenuType, menuKey: string, name: string, routePath?: string, icon?: string, permissionCode?: string, sortOrder: number, isEnabled: boolean }} payload 菜单提交数据。
 * @returns {Promise<{ item: AdminMenuDto }>} 新建后的菜单节点。
 */
export async function createAdminMenu(payload: {
  parentId?: number | null
  menuType: AdminMenuType
  menuKey: string
  name: string
  routePath?: string
  icon?: string
  permissionCode?: string
  sortOrder: number
  isEnabled: boolean
}) {
  return request<{ item: AdminMenuDto }>('/admin/menus', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 更新指定后台菜单或按钮权限节点。
 *
 * @param {number} menuId 菜单 id。
 * @param {{ parentId?: number | null, menuType: AdminMenuType, menuKey: string, name: string, routePath?: string, icon?: string, permissionCode?: string, sortOrder: number, isEnabled: boolean }} payload 菜单提交数据。
 * @returns {Promise<{ item: AdminMenuDto }>} 更新后的菜单节点。
 */
export async function updateAdminMenu(menuId: number, payload: {
  parentId?: number | null
  menuType: AdminMenuType
  menuKey: string
  name: string
  routePath?: string
  icon?: string
  permissionCode?: string
  sortOrder: number
  isEnabled: boolean
}) {
  return request<{ item: AdminMenuDto }>(`/admin/menus/${menuId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/**
 * 删除指定后台菜单节点。
 *
 * @param {number} menuId 菜单 id。
 * @returns {Promise<{ success: boolean }>} 删除结果。
 */
export async function deleteAdminMenu(menuId: number) {
  return request<{ success: boolean }>(`/admin/menus/${menuId}`, {
    method: 'DELETE',
  })
}

/**
 * 获取后台角色列表。
 *
 * @returns {Promise<{ items: AdminRoleDto[] }>} 角色列表响应。
 */
export async function fetchAdminRoles() {
  return request<{ items: AdminRoleDto[] }>('/admin/roles')
}

/**
 * 创建后台角色。
 *
 * @param {{ code: string, name: string, description?: string, status: AdminEntityStatus, permissionIds: number[] }} payload 角色提交数据。
 * @returns {Promise<{ item: AdminRoleDto }>} 新建后的角色。
 */
export async function createAdminRole(payload: {
  code: string
  name: string
  description?: string
  status: AdminEntityStatus
  permissionIds: number[]
}) {
  return request<{ item: AdminRoleDto }>('/admin/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 更新指定后台角色。
 *
 * @param {number} roleId 角色 id。
 * @param {{ code: string, name: string, description?: string, status: AdminEntityStatus, permissionIds: number[] }} payload 角色提交数据。
 * @returns {Promise<{ item: AdminRoleDto }>} 更新后的角色。
 */
export async function updateAdminRole(roleId: number, payload: {
  code: string
  name: string
  description?: string
  status: AdminEntityStatus
  permissionIds: number[]
}) {
  return request<{ item: AdminRoleDto }>(`/admin/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/**
 * 删除指定后台角色。
 *
 * @param {number} roleId 角色 id。
 * @returns {Promise<{ success: boolean }>} 删除结果。
 */
export async function deleteAdminRole(roleId: number) {
  return request<{ success: boolean }>(`/admin/roles/${roleId}`, {
    method: 'DELETE',
  })
}

/**
 * 获取后台用户列表。
 *
 * @returns {Promise<{ items: AdminUserDto[] }>} 用户列表响应。
 */
export async function fetchAdminUsers() {
  return request<{ items: AdminUserDto[] }>('/admin/users')
}

/**
 * 创建后台用户。
 *
 * @param {{ username: string, displayName: string, authMode: AdminAuthMode, passwordHint?: string, status: AdminEntityStatus, roleIds: number[] }} payload 用户提交数据。
 * @returns {Promise<{ item: AdminUserDto }>} 新建后的用户。
 */
export async function createAdminUser(payload: {
  username: string
  displayName: string
  authMode: AdminAuthMode
  passwordHint?: string
  status: AdminEntityStatus
  roleIds: number[]
}) {
  return request<{ item: AdminUserDto }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 更新指定后台用户。
 *
 * @param {number} userId 用户 id。
 * @param {{ username: string, displayName: string, authMode: AdminAuthMode, passwordHint?: string, status: AdminEntityStatus, roleIds: number[] }} payload 用户提交数据。
 * @returns {Promise<{ item: AdminUserDto }>} 更新后的用户。
 */
export async function updateAdminUser(userId: number, payload: {
  username: string
  displayName: string
  authMode: AdminAuthMode
  passwordHint?: string
  status: AdminEntityStatus
  roleIds: number[]
}) {
  return request<{ item: AdminUserDto }>(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/**
 * 删除指定后台用户。
 *
 * @param {number} userId 用户 id。
 * @returns {Promise<{ success: boolean }>} 删除结果。
 */
export async function deleteAdminUser(userId: number) {
  return request<{ success: boolean }>(`/admin/users/${userId}`, {
    method: 'DELETE',
  })
}

/**
 * 获取公开系统参数，供后台仪表盘等页面读取公共配置。
 *
 * @param {{ scope?: AdminScope, groupCode?: string }} [query] 可选查询条件。
 * @returns {Promise<{ items: PublicSystemSettingDto[] }>} 系统参数列表。
 */
export async function fetchPublicSystemSettings(query?: {
  scope?: AdminScope
  groupCode?: string
}) {
  const searchParams = new URLSearchParams()

  if (query?.scope) {
    searchParams.set('scope', query.scope)
  }

  if (query?.groupCode) {
    searchParams.set('groupCode', query.groupCode)
  }

  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return request<{ items: PublicSystemSettingDto[] }>(`/public/system-settings${suffix}`)
}

/**
 * 获取订单列表。
 *
 * @returns {Promise<{ items: OrderDto[] }>} 订单列表响应。
 */
export async function fetchOrders() {
  return request<{ items: OrderDto[] }>('/orders')
}

/**
 * 获取单个订单详情。
 *
 * @param {number} orderId 订单 id。
 * @returns {Promise<{ item: OrderDto }>} 订单详情响应。
 */
export async function fetchOrderDetail(orderId: number) {
  return request<{ item: OrderDto }>(`/orders/${orderId}`)
}

/**
 * 为指定订单创建报价。
 *
 * @param {number} orderId 订单 id。
 * @param {{ quotedBy: string, amount: number, detail: Array<{ label: string, value: string }>, expiresAt: string }} payload 报价提交数据。
 * @returns {Promise<{ item: OrderDto }>} 更新后的订单详情。
 */
export async function createOrderQuote(orderId: number, payload: {
  quotedBy: string
  amount: number
  detail: Array<{ label: string, value: string }>
  expiresAt: string
}) {
  return request<{ item: OrderDto }>(`/orders/${orderId}/quotes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 为指定订单派单。
 *
 * @param {number} orderId 订单 id。
 * @param {number} workerProfileId 目标代办员 id。
 * @returns {Promise<{ item: OrderDto }>} 更新后的订单详情。
 */
export async function dispatchOrder(orderId: number, workerProfileId: number) {
  return request<{ item: OrderDto }>(`/orders/${orderId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ workerProfileId }),
  })
}

/**
 * 审核订单退款申请。
 *
 * @param {number} orderId 订单 id。
 * @param {boolean} approved 是否通过。
 * @param {string} note 审核备注。
 * @returns {Promise<{ item: OrderDto }>} 更新后的订单详情。
 */
export async function reviewOrderRefund(orderId: number, approved: boolean, note: string) {
  return request<{ item: OrderDto }>(`/orders/${orderId}/refund-review`, {
    method: 'POST',
    body: JSON.stringify({ approved, note }),
  })
}

/**
 * 由后台强制完成订单。
 *
 * @param {number} orderId 订单 id。
 * @returns {Promise<{ item: OrderDto }>} 更新后的订单详情。
 */
export async function completeAdminOrder(orderId: number) {
  return request<{ item: OrderDto }>(`/orders/${orderId}/complete`, {
    method: 'POST',
  })
}

/**
 * 触发模拟支付回调，供后台联调支付状态。
 *
 * @param {number} orderId 订单 id。
 * @param {{ paidAmount?: number }} [payload] 可选的支付金额覆盖值。
 * @returns {Promise<{ item: OrderDto }>} 更新后的订单详情。
 */
export async function triggerPaymentCallback(orderId: number, payload?: { paidAmount?: number }) {
  return request<{ item: OrderDto }>(`/orders/${orderId}/payment-callback`, {
    method: 'POST',
    body: JSON.stringify({
      channel: 'wechatpay-callback',
      callbackPayload: { source: 'admin-console' },
      ...(payload ?? {}),
    }),
  })
}

/**
 * 创建代办员档案。
 *
 * @param {CreateWorkerPayload} payload 代办员建档数据。
 * @returns {Promise<{ workerProfileId: number }>} 新建后的代办员档案 id。
 */
export async function createWorker(payload: CreateWorkerPayload) {
  return request<{ workerProfileId: number }>('/workers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 审核代办员状态。
 *
 * @param {number} workerProfileId 代办员档案 id。
 * @param {WorkerDto['status']} status 目标状态。
 * @returns {Promise<{ success: boolean }>} 审核结果。
 */
export async function reviewWorkerStatus(workerProfileId: number, status: WorkerDto['status']) {
  return request<{ success: boolean }>(`/workers/${workerProfileId}/review`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

/**
 * 创建代办员结算单。
 *
 * @param {number} workerProfileId 代办员档案 id。
 * @param {{ periodLabel: string, commissionRate: number, note?: string }} payload 结算提交数据。
 * @returns {Promise<{ success: boolean }>} 创建结果。
 */
export async function createWorkerSettlement(workerProfileId: number, payload: {
  periodLabel: string
  commissionRate: number
  note?: string
}) {
  return request<{ success: boolean }>(`/workers/${workerProfileId}/settlements`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 获取财务概览数据。
 *
 * @returns {Promise<FinanceOverviewDto>} 财务概览。
 */
export async function fetchFinanceOverview() {
  return request<FinanceOverviewDto>('/finance/overview')
}

/**
 * 获取代办员列表。
 *
 * @returns {Promise<{ items: WorkerDto[] }>} 代办员列表响应。
 */
export async function fetchWorkers() {
  return request<{ items: WorkerDto[] }>('/workers')
}

/**
 * 获取字典列表。
 *
 * @returns {Promise<{ items: DictionaryDto[] }>} 字典列表响应。
 */
export async function fetchDictionaries() {
  return request<{ items: DictionaryDto[] }>('/admin/dictionaries')
}

/**
 * 创建字典。
 *
 * @param {{ code: string, name: string, scope: AdminScope, description?: string, status: DictionaryStatus }} payload 字典提交数据。
 * @returns {Promise<{ item: DictionaryDto }>} 新建后的字典。
 */
export async function createDictionary(payload: {
  code: string
  name: string
  scope: AdminScope
  description?: string
  status: DictionaryStatus
}) {
  return request<{ item: DictionaryDto }>('/admin/dictionaries', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 更新指定字典。
 *
 * @param {number} dictionaryId 字典 id。
 * @param {{ code: string, name: string, scope: AdminScope, description?: string, status: DictionaryStatus }} payload 字典提交数据。
 * @returns {Promise<{ item: DictionaryDto }>} 更新后的字典。
 */
export async function updateDictionary(dictionaryId: number, payload: {
  code: string
  name: string
  scope: AdminScope
  description?: string
  status: DictionaryStatus
}) {
  return request<{ item: DictionaryDto }>(`/admin/dictionaries/${dictionaryId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/**
 * 删除指定字典。
 *
 * @param {number} dictionaryId 字典 id。
 * @returns {Promise<{ success: boolean }>} 删除结果。
 */
export async function deleteDictionary(dictionaryId: number) {
  return request<{ success: boolean }>(`/admin/dictionaries/${dictionaryId}`, {
    method: 'DELETE',
  })
}

/**
 * 为指定字典创建条目。
 *
 * @param {number} dictionaryId 字典 id。
 * @param {{ parentId?: number | null, itemKey: string, label: string, value: string, sortOrder: number, isEnabled: boolean, extraJson?: unknown }} payload 条目提交数据。
 * @returns {Promise<{ item: DictionaryDto }>} 更新后的字典详情。
 */
export async function createDictionaryItem(dictionaryId: number, payload: {
  parentId?: number | null
  itemKey: string
  label: string
  value: string
  sortOrder: number
  isEnabled: boolean
  extraJson?: unknown
}) {
  return request<{ item: DictionaryDto }>(`/admin/dictionaries/${dictionaryId}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 更新指定字典条目。
 *
 * @param {number} itemId 条目 id。
 * @param {{ parentId?: number | null, itemKey: string, label: string, value: string, sortOrder: number, isEnabled: boolean, extraJson?: unknown }} payload 条目提交数据。
 * @returns {Promise<{ item: DictionaryDto }>} 更新后的字典详情。
 */
export async function updateDictionaryItem(itemId: number, payload: {
  parentId?: number | null
  itemKey: string
  label: string
  value: string
  sortOrder: number
  isEnabled: boolean
  extraJson?: unknown
}) {
  return request<{ item: DictionaryDto }>(`/admin/dictionary-items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/**
 * 删除指定字典条目。
 *
 * @param {number} itemId 条目 id。
 * @returns {Promise<{ item: DictionaryDto }>} 更新后的字典详情。
 */
export async function deleteDictionaryItem(itemId: number) {
  return request<{ item: DictionaryDto }>(`/admin/dictionary-items/${itemId}`, {
    method: 'DELETE',
  })
}

/**
 * 获取系统参数列表。
 *
 * @param {{ scope?: AdminScope, groupCode?: string }} [query] 可选查询条件。
 * @returns {Promise<{ items: SystemSettingDto[] }>} 系统参数列表。
 */
export async function fetchSystemSettings(query?: {
  scope?: AdminScope
  groupCode?: string
}) {
  const searchParams = new URLSearchParams()

  if (query?.scope) {
    searchParams.set('scope', query.scope)
  }

  if (query?.groupCode) {
    searchParams.set('groupCode', query.groupCode)
  }

  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return request<{ items: SystemSettingDto[] }>(`/admin/system-settings${suffix}`)
}

/**
 * 创建系统参数。
 *
 * @param {{ scope: AdminScope, groupCode: string, settingKey: string, name: string, valueType: SettingValueType, valueText: string, description?: string, isPublic: boolean }} payload 参数提交数据。
 * @returns {Promise<{ item: SystemSettingDto }>} 新建后的系统参数。
 */
export async function createSystemSetting(payload: {
  scope: AdminScope
  groupCode: string
  settingKey: string
  name: string
  valueType: SettingValueType
  valueText: string
  description?: string
  isPublic: boolean
}) {
  return request<{ item: SystemSettingDto }>('/admin/system-settings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 更新指定系统参数。
 *
 * @param {number} settingId 参数 id。
 * @param {{ scope: AdminScope, groupCode: string, settingKey: string, name: string, valueType: SettingValueType, valueText: string, description?: string, isPublic: boolean }} payload 参数提交数据。
 * @returns {Promise<{ item: SystemSettingDto }>} 更新后的系统参数。
 */
export async function updateSystemSetting(settingId: number, payload: {
  scope: AdminScope
  groupCode: string
  settingKey: string
  name: string
  valueType: SettingValueType
  valueText: string
  description?: string
  isPublic: boolean
}) {
  return request<{ item: SystemSettingDto }>(`/admin/system-settings/${settingId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/**
 * 删除指定系统参数。
 *
 * @param {number} settingId 参数 id。
 * @returns {Promise<{ success: boolean }>} 删除结果。
 */
export async function deleteSystemSetting(settingId: number) {
  return request<{ success: boolean }>(`/admin/system-settings/${settingId}`, {
    method: 'DELETE',
  })
}