import { createRequestSignature, decryptSensitiveFields, encryptSensitiveFields, type OrderStatus, type RefundStatus } from '@mourned/domain'
import { apiBaseUrl, requestSigningSecret, sm4Secret } from './config'
import { buildAuthenticatedUserHeaders } from './session'

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
 * 统一执行用户端 API 请求，负责敏感字段加密、签名头拼装与响应解密。
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
        header: await buildAuthenticatedUserHeaders(signatureData),
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
  city: string
  district: string
  contactName: string
  contactPhone: string
  scheduledAt: string
  amount: number
  status: OrderStatus
  notes: string | null
  refundStatus?: RefundStatus
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

/**
 * 获取服务目录列表。
 *
 * @returns {Promise<{ items: ServiceItemDto[] }>} 服务列表响应。
 */
export function fetchServices() {
  return request<{ items: ServiceItemDto[] }>({
    url: '/services',
  })
}

/**
 * 获取对用户端公开的系统参数。
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
 * 获取当前用户自己的订单列表。
 *
 * @param {string} openId 当前用户的 openId。
 * @returns {Promise<{ items: OrderDto[] }>} 订单列表响应。
 */
export function fetchOrders(openId: string) {
  return request<{ items: OrderDto[] }>({
    url: `/orders?openId=${encodeURIComponent(openId)}`,
  })
}

/**
 * 提交新订单。
 *
 * @param {Record<string, unknown>} data 下单数据。
 * @returns {Promise<{ item: OrderDto }>} 新建订单详情。
 */
export function createOrder(data: Record<string, unknown>) {
  return request<{ item: OrderDto }>({
    url: '/orders',
    method: 'POST',
    data,
  })
}

/**
 * 获取单个订单详情。
 *
 * @param {number} orderId 订单 id。
 * @returns {Promise<{ item: OrderDto }>} 订单详情响应。
 */
export function fetchOrderDetail(orderId: number) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}`,
  })
}

/**
 * 确认采用指定报价。
 *
 * @param {number} orderId 订单 id。
 * @param {number} quoteId 报价 id。
 * @returns {Promise<{ item: OrderDto }>} 更新后的订单详情。
 */
export function acceptQuote(orderId: number, quoteId: number) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}/quote-acceptance`,
    method: 'POST',
    data: { quoteId },
  })
}

/**
 * 标记订单支付完成。
 *
 * @param {number} orderId 订单 id。
 * @param {number} [paidAmount] 可选的支付金额。
 * @returns {Promise<{ item: OrderDto }>} 更新后的订单详情。
 */
export function markOrderPaid(orderId: number, paidAmount?: number) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}/payment`,
    method: 'POST',
    data: { paidAmount },
  })
}

/**
 * 提交退款申请。
 *
 * @param {number} orderId 订单 id。
 * @param {string} reason 退款原因。
 * @returns {Promise<{ item: OrderDto }>} 更新后的订单详情。
 */
export function requestRefund(orderId: number, reason: string) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}/refund-request`,
    method: 'POST',
    data: { reason },
  })
}

/**
 * 提交带举证材料的退款申请。
 *
 * @param {number} orderId 订单 id。
 * @param {string} reason 退款原因。
 * @param {string[]} evidenceUrls 举证图片地址列表。
 * @returns {Promise<{ item: OrderDto }>} 更新后的订单详情。
 */
export function requestRefundWithEvidence(orderId: number, reason: string, evidenceUrls: string[]) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}/refund-request`,
    method: 'POST',
    data: { reason, evidenceUrls },
  })
}

/**
 * 上传图片文件并返回可访问地址。
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
        header: await buildAuthenticatedUserHeaders({}),
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

/**
 * 确认订单完工。
 *
 * @param {number} orderId 订单 id。
 * @returns {Promise<{ item: OrderDto }>} 更新后的订单详情。
 */
export function completeOrder(orderId: number) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}/complete`,
    method: 'POST',
  })
}