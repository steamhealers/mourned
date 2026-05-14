import { decryptSensitiveFields, encryptSensitiveFields, type OrderStatus } from '@mourned/domain'
import { apiBaseUrl, sm4Secret } from './config'
import { buildAuthenticatedWorkerHeaders } from './session'

const API_BASE_URL = apiBaseUrl

interface RequestOptions<T> {
  url: string
  method?: 'GET' | 'POST'
  data?: Record<string, unknown>
}

interface UploadResultDto {
  item: {
    fileName: string
    url: string
  }
}

/**
 * 统一执行代办员端 API 请求，负责敏感字段加密、签名头拼装与响应解密。
 *
 * @template T 响应数据类型。
 * @param {RequestOptions<T>} options 请求配置。
 * @returns {Promise<T>} 解析并解密后的响应数据。
 */
function request<T>({ url, method = 'GET', data }: RequestOptions<T>) {
  return new Promise<T>(async (resolve, reject) => {
    try {
      const encryptedData = data ? encryptSensitiveFields(data, sm4Secret) as Record<string, unknown> : undefined
      const signatureData = method === 'GET'
        ? Object.fromEntries(new URLSearchParams(url.split('?')[1] ?? '').entries())
        : (encryptedData ?? {})

      uni.request({
        url: `${API_BASE_URL}${url}`,
        method,
        data: encryptedData,
        header: await buildAuthenticatedWorkerHeaders(signatureData),
        /**
         * 处理请求成功回调，并在状态码通过时解密响应体。
         *
         * @param {UniApp.RequestSuccessCallbackResult} response 请求成功结果。
         * @returns {void} 无返回值。
         */
        success: (response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(decryptSensitiveFields(response.data as T, sm4Secret))
            return
          }

          reject(new Error(`REQUEST_FAILED:${response.statusCode}`))
        },
        /**
         * 处理请求失败回调，并将错误继续抛给调用方。
         *
         * @param {unknown} error 请求失败错误对象。
         * @returns {void} 无返回值。
         */
        fail: reject,
      })
    }
    catch (error) {
      reject(error)
    }
  })
}

export interface WorkerOrderDto {
  id: number
  orderNo: string
  serviceName: string
  city: string
  district: string
  contactName: string
  scheduledAt: string
  amount: number
  status: OrderStatus
  notes: string | null
  fulfillmentRecords?: FulfillmentRecordDto[]
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

export interface PublicSystemSettingDto {
  id: number
  scope: 'shared' | 'user-miniapp' | 'worker-miniapp' | 'admin-web' | 'api'
  groupCode: string
  settingKey: string
  name: string
  valueType: 'string' | 'number' | 'boolean' | 'json'
  valueText: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface PublicDictionaryItemDto {
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
  children: PublicDictionaryItemDto[]
}

export interface PublicDictionaryDto {
  id: number
  code: string
  name: string
  scope: 'shared' | 'user-miniapp' | 'worker-miniapp' | 'admin-web' | 'api'
  description: string | null
  status: 'active' | 'inactive'
  itemCount: number
  createdAt: string
  updatedAt: string
  items: PublicDictionaryItemDto[]
}

/**
 * 获取当前代办员的订单列表。
 *
 * @param {number} workerProfileId 代办员档案 id。
 * @returns {Promise<{ items: WorkerOrderDto[] }>} 订单列表响应。
 */
export function fetchWorkerOrders(workerProfileId: number) {
  return request<{ items: WorkerOrderDto[] }>({
    url: `/orders?workerProfileId=${workerProfileId}`,
  })
}

/**
 * 获取对代办员端公开的系统参数。
 *
 * @param {{ scope?: 'shared' | 'user-miniapp' | 'worker-miniapp' | 'admin-web' | 'api', groupCode?: string }} [query] 可选查询条件。
 * @returns {Promise<{ items: PublicSystemSettingDto[] }>} 公开系统参数列表。
 */
export function fetchPublicSystemSettings(query?: {
  scope?: 'shared' | 'user-miniapp' | 'worker-miniapp' | 'admin-web' | 'api'
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

  return request<{ items: PublicSystemSettingDto[] }>({
    url: `/public/system-settings${suffix}`,
  })
}

/**
 * 根据字典编码获取公开字典及其条目树。
 *
 * @param {string} code 字典编码。
 * @param {{ scope?: 'shared' | 'user-miniapp' | 'worker-miniapp' | 'admin-web' | 'api' }} [query] 可选查询条件。
 * @returns {Promise<{ item: PublicDictionaryDto }>} 公开字典详情。
 */
export function fetchPublicDictionary(code: string, query?: {
  scope?: 'shared' | 'user-miniapp' | 'worker-miniapp' | 'admin-web' | 'api'
}) {
  const searchParams = new URLSearchParams()

  if (query?.scope) {
    searchParams.set('scope', query.scope)
  }

  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : ''

  return request<{ item: PublicDictionaryDto }>({
    url: `/public/dictionaries/${encodeURIComponent(code)}${suffix}`,
  })
}

/**
 * 获取待接单列表。
 *
 * @returns {Promise<{ items: WorkerOrderDto[] }>} 待接单列表响应。
 */
export function fetchPendingOrders() {
  return request<{ items: WorkerOrderDto[] }>({
    url: '/orders?status=pending_dispatch',
  })
}

/**
 * 提交接单操作。
 *
 * @param {number} orderId 订单 id。
 * @param {number} workerProfileId 代办员档案 id。
 * @returns {Promise<{ item: WorkerOrderDto }>} 更新后的订单详情。
 */
export function acceptOrder(orderId: number, workerProfileId: number) {
  return request<{ item: WorkerOrderDto }>({
    url: `/orders/${orderId}/accept`,
    method: 'POST',
    data: { workerProfileId },
  })
}

/**
 * 新增履约记录。
 *
 * @param {number} orderId 订单 id。
 * @param {Record<string, unknown>} data 履约提交数据。
 * @returns {Promise<{ item: WorkerOrderDto }>} 更新后的订单详情。
 */
export function createFulfillment(orderId: number, data: Record<string, unknown>) {
  return request<{ item: WorkerOrderDto }>({
    url: `/orders/${orderId}/fulfillment`,
    method: 'POST',
    data,
  })
}

/**
 * 获取代办员端订单详情。
 *
 * @param {number} orderId 订单 id。
 * @returns {Promise<{ item: WorkerOrderDto }>} 订单详情响应。
 */
export function fetchWorkerOrderDetail(orderId: number) {
  return request<{ item: WorkerOrderDto }>({
    url: `/orders/${orderId}`,
  })
}

/**
 * 确认订单完工。
 *
 * @param {number} orderId 订单 id。
 * @returns {Promise<{ item: WorkerOrderDto }>} 更新后的订单详情。
 */
export function completeWorkerOrder(orderId: number) {
  return request<{ item: WorkerOrderDto }>({
    url: `/orders/${orderId}/complete`,
    method: 'POST',
  })
}

/**
 * 上传履约图片并返回可访问地址。
 *
 * @param {string} filePath 本地文件路径。
 * @returns {Promise<string>} 上传后的完整文件地址。
 */
export function uploadImage(filePath: string) {
  return new Promise<string>(async (resolve, reject) => {
    try {
      uni.uploadFile({
        url: `${API_BASE_URL}/uploads`,
        filePath,
        name: 'file',
        header: await buildAuthenticatedWorkerHeaders({}),
        /**
         * 处理上传成功回调，并提取静态资源访问地址。
         *
         * @param {UniApp.UploadFileSuccessCallbackResult} response 上传成功结果。
         * @returns {void} 无返回值。
         */
        success: (response) => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`UPLOAD_FAILED:${response.statusCode}`))
            return
          }

          const data = JSON.parse(response.data) as UploadResultDto
          resolve(`${API_BASE_URL}${data.item.url}`)
        },
        /**
         * 处理上传失败回调，并将错误继续抛给调用方。
         *
         * @param {unknown} error 上传失败错误对象。
         * @returns {void} 无返回值。
         */
        fail: reject,
      })
    }
    catch (error) {
      reject(error)
    }
  })
}