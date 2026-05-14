/// <reference path="./types/sm-crypto.d.ts" />

import CryptoJS from 'crypto-js'
import { sm4 } from 'sm-crypto'

export type TradeMode = 'direct' | 'quote' | 'review'
export type DeliveryMode = 'onsite' | 'remote' | 'hybrid'
export type ClientType = 'user-miniapp' | 'worker-miniapp' | 'admin-web'

const sensitiveFieldNames = new Set([
  'phone',
  'realName',
  'contactName',
  'contactPhone',
  'workerName',
  'displayName',
  'password',
])
export const orderStatuses = [
  'pending_quote',
  'pending_payment',
  'pending_dispatch',
  'in_service',
  'pending_confirm',
  'completed',
  'refund_in_progress',
  'refunded',
  'closed',
] as const

export type OrderStatus = (typeof orderStatuses)[number]

export const refundStatuses = ['none', 'requested', 'approved', 'rejected', 'refunded'] as const

export type RefundStatus = (typeof refundStatuses)[number]

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending_quote: '待报价',
  pending_payment: '待支付',
  pending_dispatch: '待派单',
  in_service: '服务中',
  pending_confirm: '待确认',
  completed: '已完成',
  refund_in_progress: '售后中',
  refunded: '已退款',
  closed: '已关闭',
}

export const refundStatusLabels: Record<RefundStatus, string> = {
  none: '无售后',
  requested: '已申请',
  approved: '已通过',
  rejected: '已驳回',
  refunded: '已退款',
}

/**
 * 获取订单状态对应的中文文案。
 *
 * @param {OrderStatus} status 订单状态值。
 * @returns {string} 对应的中文标签。
 */
export function getOrderStatusLabel(status: OrderStatus) {
  return orderStatusLabels[status]
}

/**
 * 获取退款状态对应的中文文案；空值时回退到“无售后”。
 *
 * @param {RefundStatus | null | undefined} status 退款状态值。
 * @returns {string} 对应的中文标签。
 */
export function getRefundStatusLabel(status: RefundStatus | null | undefined) {
  if (!status) {
    return refundStatusLabels.none
  }

  return refundStatusLabels[status]
}

export interface ServiceItem {
  code: string
  name: string
  tradeMode: TradeMode
  deliveryMode: DeliveryMode
  description: string
}

export interface DashboardMetric {
  label: string
  value: string
}

export interface FulfillmentStage {
  code: string
  name: string
  description: string
}

export const serviceCatalog: ServiceItem[] = [
  {
    code: 'memorial-cleaning',
    name: '代祭扫与墓位清洁',
    tradeMode: 'direct',
    deliveryMode: 'onsite',
    description: '适合异地家庭快速下单，强调照片视频回传和关键节点存证。',
  },
  {
    code: 'errand-support',
    name: '白事跑腿代办',
    tradeMode: 'direct',
    deliveryMode: 'onsite',
    description: '覆盖鲜花贡品代购、白事用品配送、墓园陪同与材料代跑。',
  },
  {
    code: 'funeral-consulting',
    name: '白事咨询与套餐报价',
    tradeMode: 'quote',
    deliveryMode: 'remote',
    description: '先提交需求，再由平台输出可确认的报价单与服务建议。',
  },
  {
    code: 'cemetery-consulting',
    name: '风水选墓咨询',
    tradeMode: 'review',
    deliveryMode: 'hybrid',
    description: '默认进入预约审核链路，强调环境与礼仪咨询，不做结果承诺。',
  },
  {
    code: 'online-memorial',
    name: '线上纪念馆与云祭扫',
    tradeMode: 'direct',
    deliveryMode: 'remote',
    description: '用于拉新与留存，支持祭日提醒、家庭留言与公开范围控制。',
  },
]

export const userQuickActions = [
  {
    title: '快速下单',
    description: '为代祭扫、跑腿代办建立标准化交易入口。',
  },
  {
    title: '询价与咨询',
    description: '对白事协办和非标需求生成待确认报价。',
  },
  {
    title: '查看履约凭证',
    description: '在订单中查看到场、摆放、清洁、祭扫完成等节点记录。',
  },
]

export const workerDashboard: DashboardMetric[] = [
  {
    label: '待接单',
    value: '06',
  },
  {
    label: '今日任务',
    value: '04',
  },
  {
    label: '待上传凭证',
    value: '03',
  },
  {
    label: '本周收入',
    value: '¥2,640',
  },
]

export const fulfillmentStages: FulfillmentStage[] = [
  {
    code: 'arrival',
    name: '到场打卡',
    description: '记录时间、地点和首张现场照片，作为履约起点。',
  },
  {
    code: 'preparation',
    name: '供品摆放',
    description: '上传供品摆放前后照片，并记录特殊备注。',
  },
  {
    code: 'service',
    name: '服务执行',
    description: '记录清扫、祭拜、陪同或跑腿完成的关键节点。',
  },
  {
    code: 'completion',
    name: '完结提交',
    description: '提交整单说明，等待用户确认和后台结算。',
  },
]

export const adminHighlights: DashboardMetric[] = [
  {
    label: '今日新增订单',
    value: '18',
  },
  {
    label: '待审核代办员',
    value: '7',
  },
  {
    label: '待处理售后',
    value: '3',
  },
  {
    label: '纪念馆待审核内容',
    value: '12',
  },
]

/**
 * 归一化签名原文中的值，确保对象键顺序、日期和空值在三端与服务端之间保持一致。
 *
 * @param {unknown} value 待归一化的值。
 * @returns {unknown} 适合参与签名序列化的稳定值。
 */
function normalizeSignatureValue(value: unknown): unknown {
  if (value === undefined) {
    return null
  }

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeSignatureValue(item))
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = normalizeSignatureValue((value as Record<string, unknown>)[key])
        return result
      }, {})
  }

  return String(value)
}

/**
 * 构建参与请求签名的标准载荷。
 *
 * @param {{ clientType: ClientType, timestamp: string | number, data: unknown }} input 签名输入。
 * @returns {{ clientType: ClientType, timestamp: string, data: unknown }} 归一化后的签名载荷。
 */
export function buildRequestSignaturePayload(input: {
  clientType: ClientType
  timestamp: string | number
  data: unknown
}) {
  return {
    clientType: input.clientType,
    timestamp: String(input.timestamp),
    data: normalizeSignatureValue(input.data),
  }
}

/**
 * 基于标准签名载荷生成 HMAC-MD5 请求签名。
 *
 * @param {{ clientType: ClientType, timestamp: string | number, data: unknown, secret: string }} input 签名输入与密钥。
 * @returns {string} 十六进制签名字符串。
 */
export function createRequestSignature(input: {
  clientType: ClientType
  timestamp: string | number
  data: unknown
  secret: string
}) {
  const payload = buildRequestSignaturePayload({
    clientType: input.clientType,
    timestamp: input.timestamp,
    data: input.data,
  })

  return CryptoJS.HmacMD5(JSON.stringify(payload), input.secret).toString()
}

/**
 * 递归遍历对象、数组与字符串字段，并只对敏感字段名执行传入的转换器。
 *
 * @param {unknown} value 待处理的值。
 * @param {string} secret 传给转换器的密钥。
 * @param {(input: string, secret: string) => string} transformer 字符串转换函数。
 * @param {string} [fieldName] 当前字段名。
 * @returns {unknown} 处理后的值。
 */
function transformSensitiveFields(
  value: unknown,
  secret: string,
  transformer: (input: string, secret: string) => string,
  fieldName?: string,
): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    return fieldName && sensitiveFieldNames.has(fieldName) ? transformer(value, secret) : value
  }

  if (Array.isArray(value)) {
    return value.map(item => transformSensitiveFields(item, secret, transformer, fieldName))
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, currentValue]) => {
      result[key] = transformSensitiveFields(currentValue, secret, transformer, key)
      return result
    }, {})
  }

  return value
}

/**
 * 对单个敏感字符串执行 SM4 加密；已经带前缀的值会直接跳过。
 *
 * @param {string} value 待加密的明文。
 * @param {string} secret SM4 密钥。
 * @returns {string} 带 sm4: 前缀的密文，或原始值。
 */
export function encryptSensitiveText(value: string, secret: string) {
  if (!value || value.startsWith('sm4:')) {
    return value
  }

  return `sm4:${sm4.encrypt(value, secret, { output: 'string' })}`
}

/**
 * 对单个敏感字符串执行 SM4 解密；非 sm4: 前缀的值会直接返回。
 *
 * @param {string} value 待解密的密文。
 * @param {string} secret SM4 密钥。
 * @returns {string} 解密后的明文，或原始值。
 */
export function decryptSensitiveText(value: string, secret: string) {
  if (!value || !value.startsWith('sm4:')) {
    return value
  }

  return sm4.decrypt(value.slice(4), secret, { output: 'string' }) as string
}

/**
 * 递归加密对象中的敏感字段。
 *
 * @template T 输入数据类型。
 * @param {T} value 待加密的数据。
 * @param {string} secret SM4 密钥。
 * @returns {T} 处理后的数据。
 */
export function encryptSensitiveFields<T>(value: T, secret: string): T {
  return transformSensitiveFields(value, secret, encryptSensitiveText) as T
}

/**
 * 递归解密对象中的敏感字段。
 *
 * @template T 输入数据类型。
 * @param {T} value 待解密的数据。
 * @param {string} secret SM4 密钥。
 * @returns {T} 处理后的数据。
 */
export function decryptSensitiveFields<T>(value: T, secret: string): T {
  return transformSensitiveFields(value, secret, decryptSensitiveText) as T
}