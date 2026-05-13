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

export interface WorkerOrderDto {
  id: number
  orderNo: string
  serviceName: string
  city: string
  district: string
  contactName: string
  scheduledAt: string
  amount: number
  status: string
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

export function fetchWorkerOrders(workerProfileId: number) {
  return request<{ items: WorkerOrderDto[] }>({
    url: `/orders?workerProfileId=${workerProfileId}`,
  })
}

export function fetchPendingOrders() {
  return request<{ items: WorkerOrderDto[] }>({
    url: '/orders?status=pending_dispatch',
  })
}

export function acceptOrder(orderId: number, workerProfileId: number) {
  return request<{ item: WorkerOrderDto }>({
    url: `/orders/${orderId}/accept`,
    method: 'POST',
    data: { workerProfileId },
  })
}

export function createFulfillment(orderId: number, data: Record<string, unknown>) {
  return request<{ item: WorkerOrderDto }>({
    url: `/orders/${orderId}/fulfillment`,
    method: 'POST',
    data,
  })
}

export function fetchWorkerOrderDetail(orderId: number) {
  return request<{ item: WorkerOrderDto }>({
    url: `/orders/${orderId}`,
  })
}

export function completeWorkerOrder(orderId: number) {
  return request<{ item: WorkerOrderDto }>({
    url: `/orders/${orderId}/complete`,
    method: 'POST',
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