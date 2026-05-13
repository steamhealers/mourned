import { z } from 'zod'

export const orderStatusSchema = z.enum([
  'pending_quote',
  'pending_payment',
  'pending_dispatch',
  'in_service',
  'pending_confirm',
  'completed',
  'refund_in_progress',
  'refunded',
  'closed',
])

export const quoteStatusSchema = z.enum(['draft', 'submitted', 'accepted', 'expired', 'rejected'])

export const refundStatusSchema = z.enum(['none', 'requested', 'approved', 'rejected', 'refunded'])
export const workerStatusSchema = z.enum(['pending', 'active', 'frozen'])

export const createOrderSchema = z.object({
  openId: z.string().min(1),
  phone: z.string().min(6).optional(),
  realName: z.string().min(1).optional(),
  serviceCode: z.string().min(1),
  city: z.string().min(1),
  district: z.string().min(1),
  contactName: z.string().min(1),
  contactPhone: z.string().min(6),
  scheduledAt: z.string().datetime(),
  amount: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
})

export const createQuoteSchema = z.object({
  quotedBy: z.string().min(1),
  amount: z.number().nonnegative(),
  detail: z.array(
    z.object({
      label: z.string().min(1),
      value: z.string().min(1),
    }),
  ),
  expiresAt: z.string().datetime(),
})

export const acceptOrderSchema = z.object({
  workerProfileId: z.number().int().positive(),
})

export const createFulfillmentSchema = z.object({
  stageCode: z.string().min(1),
  mediaUrl: z.string().url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().max(255).optional(),
})

export const createWorkerSchema = z.object({
  openId: z.string().min(1),
  phone: z.string().min(6),
  realName: z.string().min(1),
  serviceArea: z.string().min(1),
  serviceTags: z.array(z.string().min(1)).default([]),
})

export const acceptQuoteSchema = z.object({
  quoteId: z.number().int().positive(),
})

export const markPaidSchema = z.object({
  paidAmount: z.number().nonnegative().optional(),
  channel: z.string().min(1).optional(),
  transactionNo: z.string().min(1).optional(),
})

export const paymentCallbackSchema = markPaidSchema.extend({
  callbackPayload: z.record(z.string(), z.unknown()).optional(),
})

export const requestRefundSchema = z.object({
  reason: z.string().min(1).max(255),
  evidenceUrls: z.array(z.string().url()).max(9).optional(),
})

export const reviewRefundSchema = z.object({
  approved: z.boolean(),
  note: z.string().max(255).optional(),
})

export const reviewWorkerSchema = z.object({
  status: workerStatusSchema,
})

export const createSettlementSchema = z.object({
  periodLabel: z.string().min(1).max(64),
  commissionRate: z.number().min(0).max(100).default(12),
  note: z.string().max(255).optional(),
})

export const orderListQuerySchema = z.object({
  openId: z.string().min(1).optional(),
  workerProfileId: z.coerce.number().int().positive().optional(),
  status: orderStatusSchema.optional(),
})

export const workerListQuerySchema = z.object({
  status: z.enum(['pending', 'active', 'frozen']).optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
export type AcceptOrderInput = z.infer<typeof acceptOrderSchema>
export type CreateFulfillmentInput = z.infer<typeof createFulfillmentSchema>
export type CreateWorkerInput = z.infer<typeof createWorkerSchema>
export type AcceptQuoteInput = z.infer<typeof acceptQuoteSchema>
export type MarkPaidInput = z.infer<typeof markPaidSchema>
export type PaymentCallbackInput = z.infer<typeof paymentCallbackSchema>
export type RequestRefundInput = z.infer<typeof requestRefundSchema>
export type ReviewRefundInput = z.infer<typeof reviewRefundSchema>
export type ReviewWorkerInput = z.infer<typeof reviewWorkerSchema>
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>
export type OrderListQuery = z.infer<typeof orderListQuerySchema>
export type WorkerListQuery = z.infer<typeof workerListQuerySchema>