const API_BASE_URL = 'http://127.0.0.1:3000'

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

function request<T>({ url, method = 'GET', data }: RequestOptions<T>) {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T)
          return
        }

        reject(new Error(`REQUEST_FAILED:${response.statusCode}`))
      },
      fail: reject,
    })
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
  status: string
  notes: string | null
  refundStatus?: string
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

export function fetchServices() {
  return request<{ items: ServiceItemDto[] }>({
    url: '/services',
  })
}

export function fetchOrders(openId: string) {
  return request<{ items: OrderDto[] }>({
    url: `/orders?openId=${encodeURIComponent(openId)}`,
  })
}

export function createOrder(data: Record<string, unknown>) {
  return request<{ item: OrderDto }>({
    url: '/orders',
    method: 'POST',
    data,
  })
}

export function fetchOrderDetail(orderId: number) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}`,
  })
}

export function acceptQuote(orderId: number, quoteId: number) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}/quote-acceptance`,
    method: 'POST',
    data: { quoteId },
  })
}

export function markOrderPaid(orderId: number, paidAmount?: number) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}/payment`,
    method: 'POST',
    data: { paidAmount },
  })
}

export function requestRefund(orderId: number, reason: string) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}/refund-request`,
    method: 'POST',
    data: { reason },
  })
}

export function requestRefundWithEvidence(orderId: number, reason: string, evidenceUrls: string[]) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}/refund-request`,
    method: 'POST',
    data: { reason, evidenceUrls },
  })
}

export function uploadImage(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}/uploads`,
      filePath,
      name: 'file',
      success: (response) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`UPLOAD_FAILED:${response.statusCode}`))
          return
        }

        const data = JSON.parse(response.data) as UploadResultDto
        resolve(`${API_BASE_URL}${data.item.url}`)
      },
      fail: reject,
    })
  })
}

export function completeOrder(orderId: number) {
  return request<{ item: OrderDto }>({
    url: `/orders/${orderId}/complete`,
    method: 'POST',
  })
}