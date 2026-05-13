const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`API_REQUEST_FAILED:${response.status}`)
  }

  return response.json() as Promise<T>
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
  status: string
  refundStatus: string
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

export async function fetchServices() {
  return request<{ items: ServiceItemDto[] }>('/services')
}

export async function fetchOrders() {
  return request<{ items: OrderDto[] }>('/orders')
}

export async function fetchOrderDetail(orderId: number) {
  return request<{ item: OrderDto }>(`/orders/${orderId}`)
}

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

export async function dispatchOrder(orderId: number, workerProfileId: number) {
  return request<{ item: OrderDto }>(`/orders/${orderId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ workerProfileId }),
  })
}

export async function reviewOrderRefund(orderId: number, approved: boolean, note: string) {
  return request<{ item: OrderDto }>(`/orders/${orderId}/refund-review`, {
    method: 'POST',
    body: JSON.stringify({ approved, note }),
  })
}

export async function completeAdminOrder(orderId: number) {
  return request<{ item: OrderDto }>(`/orders/${orderId}/complete`, {
    method: 'POST',
  })
}

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

export async function reviewWorkerStatus(workerProfileId: number, status: WorkerDto['status']) {
  return request<{ success: boolean }>(`/workers/${workerProfileId}/review`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

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

export async function fetchFinanceOverview() {
  return request<FinanceOverviewDto>('/finance/overview')
}

export async function fetchWorkers() {
  return request<{ items: WorkerDto[] }>('/workers')
}