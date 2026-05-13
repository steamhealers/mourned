import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { pool } from '../../lib/db'
import type {
  AcceptOrderInput,
  AcceptQuoteInput,
  CreateSettlementInput,
  CreateFulfillmentInput,
  CreateOrderInput,
  CreateQuoteInput,
  CreateWorkerInput,
  MarkPaidInput,
  OrderListQuery,
  PaymentCallbackInput,
  RequestRefundInput,
  ReviewWorkerInput,
  ReviewRefundInput,
  WorkerListQuery,
} from './types'

interface ServiceRow extends RowDataPacket {
  id: number
  code: string
  name: string
  trade_mode: 'direct' | 'quote' | 'review'
  delivery_mode: 'onsite' | 'remote' | 'hybrid'
  description: string
}

interface OrderRow extends RowDataPacket {
  id: number
  order_no: string
  user_id: number
  service_item_id: number
  worker_profile_id: number | null
  city: string
  district: string
  contact_name: string
  contact_phone: string
  scheduled_at: string
  amount: string
  status: string
  refund_status: string
  notes: string | null
  created_at: string
  updated_at: string
  service_code: string
  service_name: string
  service_trade_mode: string
  worker_name: string | null
  user_open_id: string
}

interface QuoteRow extends RowDataPacket {
  id: number
  quoted_by: string
  amount: string
  detail: string
  expires_at: string
  status: string
  created_at: string
}

interface FulfillmentRow extends RowDataPacket {
  id: number
  stage_code: string
  media_url: string | null
  latitude: string | null
  longitude: string | null
  description: string | null
  created_at: string
}

interface WorkerRow extends RowDataPacket {
  id: number
  user_id: number
  service_area: string
  service_tags: string | null
  rating: string
  completed_order_count: number
  status: 'pending' | 'active' | 'frozen'
  created_at: string
  updated_at: string
  real_name: string
  phone: string | null
}

interface PaymentRecordRow extends RowDataPacket {
  id: number
  order_id: number
  order_no: string
  channel: string
  transaction_no: string
  amount: string
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  paid_at: string
  created_at: string
}

interface RefundRecordRow extends RowDataPacket {
  id: number
  order_id: number
  order_no: string
  reason: string
  evidence_urls: string | null
  status: 'requested' | 'approved' | 'rejected' | 'refunded'
  review_note: string | null
  created_at: string
  updated_at: string
}

interface SettlementRow extends RowDataPacket {
  id: number
  worker_profile_id: number
  worker_name: string
  period_label: string
  gross_amount: string
  commission_rate: string
  net_amount: string
  status: 'pending' | 'paid'
  note: string | null
  created_at: string
}

export async function listServices() {
  const [rows] = await pool.query<ServiceRow[]>(`
    SELECT id, code, name, trade_mode, delivery_mode, description
    FROM service_items
    WHERE is_active = 1
    ORDER BY id ASC
  `)

  return rows.map(service => ({
    id: service.id,
    code: service.code,
    name: service.name,
    tradeMode: service.trade_mode,
    deliveryMode: service.delivery_mode,
    description: service.description,
  }))
}

async function ensureUser(connection: PoolConnection, input: CreateOrderInput | CreateWorkerInput) {
  const [existingUsers] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM users WHERE open_id = :openId LIMIT 1',
    { openId: input.openId },
  )

  if (existingUsers[0]?.id) {
    await connection.query(
      `
        UPDATE users
        SET phone = COALESCE(:phone, phone),
            real_name = COALESCE(:realName, real_name),
            real_name_verified = CASE WHEN :realName IS NULL THEN real_name_verified ELSE 1 END
        WHERE id = :id
      `,
      {
        id: existingUsers[0].id,
        phone: 'phone' in input ? input.phone ?? null : null,
        realName: input.realName ?? null,
      },
    )

    return Number(existingUsers[0].id)
  }

  const [result] = await connection.query<ResultSetHeader>(
    `
      INSERT INTO users (open_id, phone, real_name, real_name_verified)
      VALUES (:openId, :phone, :realName, :verified)
    `,
    {
      openId: input.openId,
      phone: 'phone' in input ? input.phone ?? null : null,
      realName: input.realName ?? null,
      verified: input.realName ? 1 : 0,
    },
  )

  return Number(result.insertId)
}

async function getServiceByCode(connection: PoolConnection, serviceCode: string) {
  const [services] = await connection.query<ServiceRow[]>(
    'SELECT id, code, name, trade_mode, delivery_mode, description FROM service_items WHERE code = :serviceCode LIMIT 1',
    { serviceCode },
  )

  return services[0] ?? null
}

function buildOrderNo() {
  return `MO${Date.now()}`
}

export async function createOrder(input: CreateOrderInput) {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const userId = await ensureUser(connection, input)
    const service = await getServiceByCode(connection, input.serviceCode)

    if (!service) {
      throw new Error('SERVICE_NOT_FOUND')
    }

    const status = service.trade_mode === 'direct' ? 'pending_dispatch' : 'pending_quote'
    const amount = input.amount ?? 0

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO orders (
          order_no,
          user_id,
          service_item_id,
          city,
          district,
          contact_name,
          contact_phone,
          scheduled_at,
          amount,
          status,
          notes
        )
        VALUES (
          :orderNo,
          :userId,
          :serviceItemId,
          :city,
          :district,
          :contactName,
          :contactPhone,
          :scheduledAt,
          :amount,
          :status,
          :notes
        )
      `,
      {
        orderNo: buildOrderNo(),
        userId,
        serviceItemId: service.id,
        city: input.city,
        district: input.district,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        scheduledAt: input.scheduledAt,
        amount,
        status,
        notes: input.notes ?? null,
      },
    )

    await connection.commit()

    return getOrderDetail(Number(result.insertId))
  }
  catch (error) {
    await connection.rollback()
    throw error
  }
  finally {
    connection.release()
  }
}

export async function listOrders(query: OrderListQuery) {
  const conditions: string[] = []
  const params: Record<string, string | number> = {}

  if (query.openId) {
    conditions.push('u.open_id = :openId')
    params.openId = query.openId
  }

  if (query.workerProfileId) {
    conditions.push('o.worker_profile_id = :workerProfileId')
    params.workerProfileId = query.workerProfileId
  }

  if (query.status) {
    conditions.push('o.status = :status')
    params.status = query.status
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const [rows] = await pool.query<OrderRow[]>(
    `
      SELECT
        o.id,
        o.order_no,
        o.user_id,
        o.service_item_id,
        o.worker_profile_id,
        o.city,
        o.district,
        o.contact_name,
        o.contact_phone,
        o.scheduled_at,
        o.amount,
        o.status,
        o.refund_status,
        o.notes,
        o.created_at,
        o.updated_at,
        s.code AS service_code,
        s.name AS service_name,
        s.trade_mode AS service_trade_mode,
        u.open_id AS user_open_id,
        wu.real_name AS worker_name
      FROM orders o
      INNER JOIN service_items s ON s.id = o.service_item_id
      INNER JOIN users u ON u.id = o.user_id
      LEFT JOIN worker_profiles wp ON wp.id = o.worker_profile_id
      LEFT JOIN users wu ON wu.id = wp.user_id
      ${whereClause}
      ORDER BY o.created_at DESC
    `,
    params,
  )

  return rows.map(mapOrderSummary)
}

export async function getOrderDetail(orderId: number) {
  const [orders] = await pool.query<OrderRow[]>(
    `
      SELECT
        o.id,
        o.order_no,
        o.user_id,
        o.service_item_id,
        o.worker_profile_id,
        o.city,
        o.district,
        o.contact_name,
        o.contact_phone,
        o.scheduled_at,
        o.amount,
        o.status,
        o.refund_status,
        o.notes,
        o.created_at,
        o.updated_at,
        s.code AS service_code,
        s.name AS service_name,
        s.trade_mode AS service_trade_mode,
        u.open_id AS user_open_id,
        wu.real_name AS worker_name
      FROM orders o
      INNER JOIN service_items s ON s.id = o.service_item_id
      INNER JOIN users u ON u.id = o.user_id
      LEFT JOIN worker_profiles wp ON wp.id = o.worker_profile_id
      LEFT JOIN users wu ON wu.id = wp.user_id
      WHERE o.id = :orderId
      LIMIT 1
    `,
    { orderId },
  )

  const order = orders[0]

  if (!order) {
    return null
  }

  const [quotes] = await pool.query<QuoteRow[]>(
    `
      SELECT id, quoted_by, amount, detail, expires_at, status, created_at
      FROM quotes
      WHERE order_id = :orderId
      ORDER BY created_at DESC
    `,
    { orderId },
  )

  const [records] = await pool.query<FulfillmentRow[]>(
    `
      SELECT id, stage_code, media_url, latitude, longitude, description, created_at
      FROM fulfillment_records
      WHERE order_id = :orderId
      ORDER BY created_at ASC
    `,
    { orderId },
  )

  return {
    ...mapOrderSummary(order),
    quotes: quotes.map(quote => ({
      id: quote.id,
      quotedBy: quote.quoted_by,
      amount: Number(quote.amount),
      detail: JSON.parse(quote.detail) as Array<{ label: string, value: string }>,
      expiresAt: quote.expires_at,
      status: quote.status,
      createdAt: quote.created_at,
    })),
    fulfillmentRecords: records.map(record => ({
      id: record.id,
      stageCode: record.stage_code,
      mediaUrl: record.media_url,
      latitude: record.latitude ? Number(record.latitude) : null,
      longitude: record.longitude ? Number(record.longitude) : null,
      description: record.description,
      createdAt: record.created_at,
    })),
  }
}

export async function createQuote(orderId: number, input: CreateQuoteInput) {
  await pool.query<ResultSetHeader>(
    `
      INSERT INTO quotes (order_id, quoted_by, amount, detail, expires_at, status)
      VALUES (:orderId, :quotedBy, :amount, :detail, :expiresAt, 'submitted')
    `,
    {
      orderId,
      quotedBy: input.quotedBy,
      amount: input.amount,
      detail: JSON.stringify(input.detail),
      expiresAt: input.expiresAt,
    },
  )

  await pool.query(
    `
      UPDATE orders
      SET amount = :amount,
          status = 'pending_payment'
      WHERE id = :orderId
    `,
    {
      orderId,
      amount: input.amount,
    },
  )

  return getOrderDetail(orderId)
}

export async function acceptQuote(orderId: number, input: AcceptQuoteInput) {
  await pool.query(
    `
      UPDATE quotes
      SET status = CASE WHEN id = :quoteId THEN 'accepted' ELSE 'rejected' END
      WHERE order_id = :orderId
    `,
    {
      orderId,
      quoteId: input.quoteId,
    },
  )

  await pool.query(
    `
      UPDATE orders
      SET status = 'pending_payment'
      WHERE id = :orderId
    `,
    { orderId },
  )

  return getOrderDetail(orderId)
}

export async function markOrderPaid(orderId: number, input: MarkPaidInput) {
  const order = await getOrderDetail(orderId)

  if (!order) {
    throw new Error('ORDER_NOT_FOUND')
  }

  await pool.query<ResultSetHeader>(
    `
      INSERT INTO payment_records (order_id, channel, transaction_no, amount, status, callback_payload)
      VALUES (:orderId, :channel, :transactionNo, :amount, 'succeeded', NULL)
    `,
    {
      orderId,
      channel: input.channel ?? 'wechat-miniapp',
      transactionNo: input.transactionNo ?? buildPaymentNo(),
      amount: input.paidAmount ?? order.amount,
    },
  )

  await pool.query(
    `
      UPDATE orders
      SET amount = COALESCE(:paidAmount, amount),
          status = 'pending_dispatch'
      WHERE id = :orderId
    `,
    {
      orderId,
      paidAmount: input.paidAmount ?? null,
    },
  )

  return getOrderDetail(orderId)
}

export async function handlePaymentCallback(orderId: number, input: PaymentCallbackInput) {
  const order = await getOrderDetail(orderId)

  if (!order) {
    throw new Error('ORDER_NOT_FOUND')
  }

  await pool.query<ResultSetHeader>(
    `
      INSERT INTO payment_records (order_id, channel, transaction_no, amount, status, callback_payload)
      VALUES (:orderId, :channel, :transactionNo, :amount, 'succeeded', :callbackPayload)
    `,
    {
      orderId,
      channel: input.channel ?? 'wechatpay-callback',
      transactionNo: input.transactionNo ?? buildPaymentNo(),
      amount: input.paidAmount ?? order.amount,
      callbackPayload: input.callbackPayload ? JSON.stringify(input.callbackPayload) : null,
    },
  )

  await pool.query(
    `
      UPDATE orders
      SET amount = COALESCE(:paidAmount, amount),
          status = 'pending_dispatch'
      WHERE id = :orderId
    `,
    {
      orderId,
      paidAmount: input.paidAmount ?? null,
    },
  )

  return getOrderDetail(orderId)
}

export async function acceptOrder(orderId: number, input: AcceptOrderInput) {
  await pool.query(
    `
      UPDATE orders
      SET worker_profile_id = :workerProfileId,
          status = 'in_service'
      WHERE id = :orderId
    `,
    {
      orderId,
      workerProfileId: input.workerProfileId,
    },
  )

  return getOrderDetail(orderId)
}

export async function createFulfillmentRecord(orderId: number, input: CreateFulfillmentInput) {
  await pool.query<ResultSetHeader>(
    `
      INSERT INTO fulfillment_records (order_id, stage_code, media_url, latitude, longitude, description)
      VALUES (:orderId, :stageCode, :mediaUrl, :latitude, :longitude, :description)
    `,
    {
      orderId,
      stageCode: input.stageCode,
      mediaUrl: input.mediaUrl ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      description: input.description ?? null,
    },
  )

  const nextStatus = input.stageCode === 'completion' ? 'pending_confirm' : 'in_service'

  await pool.query('UPDATE orders SET status = :status WHERE id = :orderId', {
    status: nextStatus,
    orderId,
  })

  return getOrderDetail(orderId)
}

export async function completeOrder(orderId: number) {
  await pool.query(
    `
      UPDATE orders
      SET status = 'completed'
      WHERE id = :orderId
    `,
    { orderId },
  )

  await pool.query(
    `
      UPDATE worker_profiles wp
      INNER JOIN orders o ON o.worker_profile_id = wp.id
      SET wp.completed_order_count = wp.completed_order_count + 1
      WHERE o.id = :orderId AND o.worker_profile_id IS NOT NULL
    `,
    { orderId },
  )

  return getOrderDetail(orderId)
}

export async function requestRefund(orderId: number, input: RequestRefundInput) {
  const refundNoteSegments = ['退款申请: ', input.reason]

  if (input.evidenceUrls?.length) {
    refundNoteSegments.push(' 证据: ', input.evidenceUrls.join(', '))
  }

  await pool.query<ResultSetHeader>(
    `
      INSERT INTO refund_records (order_id, reason, evidence_urls, status)
      VALUES (:orderId, :reason, :evidenceUrls, 'requested')
    `,
    {
      orderId,
      reason: input.reason,
      evidenceUrls: input.evidenceUrls?.length ? JSON.stringify(input.evidenceUrls) : null,
    },
  )

  await pool.query(
    `
      UPDATE orders
      SET refund_status = 'requested',
          status = 'refund_in_progress',
          notes = CONCAT(COALESCE(notes, ''), CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE '\n' END, :refundNote)
      WHERE id = :orderId
    `,
    {
      orderId,
      refundNote: refundNoteSegments.join(''),
    },
  )

  return getOrderDetail(orderId)
}

export async function reviewRefund(orderId: number, input: ReviewRefundInput) {
  const reviewStatus = input.approved ? 'refunded' : 'rejected'
  const reviewNote = input.note ?? (input.approved ? '已同意退款' : '已驳回退款')

  await pool.query(
    `
      UPDATE refund_records
      SET status = :status,
          review_note = :reviewNote
      WHERE order_id = :orderId
      ORDER BY id DESC
      LIMIT 1
    `,
    {
      orderId,
      status: reviewStatus,
      reviewNote,
    },
  )

  await pool.query(
    `
      UPDATE orders
      SET refund_status = :refundStatus,
          status = :status,
          notes = CONCAT(COALESCE(notes, ''), CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE '\n' END, '退款审核: ', :note)
      WHERE id = :orderId
    `,
    {
      orderId,
      refundStatus: reviewStatus,
      status: input.approved ? 'refunded' : 'pending_dispatch',
      note: reviewNote,
    },
  )

  return getOrderDetail(orderId)
}

export async function reviewWorker(workerProfileId: number, input: ReviewWorkerInput) {
  await pool.query(
    `
      UPDATE worker_profiles
      SET status = :status
      WHERE id = :workerProfileId
    `,
    {
      workerProfileId,
      status: input.status,
    },
  )
}

export async function createWorkerSettlement(workerProfileId: number, input: CreateSettlementInput) {
  const [totals] = await pool.query<Array<RowDataPacket & { gross_amount: string | null }>>(
    `
      SELECT COALESCE(SUM(amount), 0) AS gross_amount
      FROM orders
      WHERE worker_profile_id = :workerProfileId
        AND status = 'completed'
    `,
    { workerProfileId },
  )

  const grossAmount = Number(totals[0]?.gross_amount ?? 0)
  const netAmount = Number((grossAmount * (1 - input.commissionRate / 100)).toFixed(2))

  await pool.query(
    `
      INSERT INTO worker_settlements (worker_profile_id, period_label, gross_amount, commission_rate, net_amount, status, note)
      VALUES (:workerProfileId, :periodLabel, :grossAmount, :commissionRate, :netAmount, 'pending', :note)
      ON DUPLICATE KEY UPDATE
        gross_amount = VALUES(gross_amount),
        commission_rate = VALUES(commission_rate),
        net_amount = VALUES(net_amount),
        note = VALUES(note)
    `,
    {
      workerProfileId,
      periodLabel: input.periodLabel,
      grossAmount,
      commissionRate: input.commissionRate,
      netAmount,
      note: input.note ?? null,
    },
  )
}

export async function getFinanceOverview() {
  const [paymentRecords] = await pool.query<PaymentRecordRow[]>(
    `
      SELECT pr.id, pr.order_id, o.order_no, pr.channel, pr.transaction_no, pr.amount, pr.status, pr.paid_at, pr.created_at
      FROM payment_records pr
      INNER JOIN orders o ON o.id = pr.order_id
      ORDER BY pr.created_at DESC
      LIMIT 20
    `,
  )

  const [refundRecords] = await pool.query<RefundRecordRow[]>(
    `
      SELECT rr.id, rr.order_id, o.order_no, rr.reason, rr.evidence_urls, rr.status, rr.review_note, rr.created_at, rr.updated_at
      FROM refund_records rr
      INNER JOIN orders o ON o.id = rr.order_id
      ORDER BY rr.updated_at DESC
      LIMIT 20
    `,
  )

  const [settlements] = await pool.query<SettlementRow[]>(
    `
      SELECT ws.id, ws.worker_profile_id, u.real_name AS worker_name, ws.period_label, ws.gross_amount, ws.commission_rate, ws.net_amount, ws.status, ws.note, ws.created_at
      FROM worker_settlements ws
      INNER JOIN worker_profiles wp ON wp.id = ws.worker_profile_id
      INNER JOIN users u ON u.id = wp.user_id
      ORDER BY ws.created_at DESC
      LIMIT 20
    `,
  )

  const [metricRows] = await pool.query<Array<RowDataPacket & {
    paid_count: number
    pending_refund_count: number
    pending_settlement_count: number
    paid_amount_total: string
  }>>(
    `
      SELECT
        (SELECT COUNT(*) FROM payment_records WHERE status = 'succeeded') AS paid_count,
        (SELECT COUNT(*) FROM refund_records WHERE status = 'requested') AS pending_refund_count,
        (SELECT COUNT(*) FROM worker_settlements WHERE status = 'pending') AS pending_settlement_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payment_records WHERE status = 'succeeded') AS paid_amount_total
    `,
  )

  const metrics = metricRows[0]

  return {
    metrics: {
      paidCount: metrics.paid_count,
      pendingRefundCount: metrics.pending_refund_count,
      pendingSettlementCount: metrics.pending_settlement_count,
      paidAmountTotal: Number(metrics.paid_amount_total),
    },
    paymentRecords: paymentRecords.map(record => ({
      id: record.id,
      orderId: record.order_id,
      orderNo: record.order_no,
      channel: record.channel,
      transactionNo: record.transaction_no,
      amount: Number(record.amount),
      status: record.status,
      paidAt: record.paid_at,
      createdAt: record.created_at,
    })),
    refundRecords: refundRecords.map(record => ({
      id: record.id,
      orderId: record.order_id,
      orderNo: record.order_no,
      reason: record.reason,
      evidenceUrls: record.evidence_urls ? JSON.parse(record.evidence_urls) as string[] : [],
      status: record.status,
      reviewNote: record.review_note,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    })),
    settlements: settlements.map(item => ({
      id: item.id,
      workerProfileId: item.worker_profile_id,
      workerName: item.worker_name,
      periodLabel: item.period_label,
      grossAmount: Number(item.gross_amount),
      commissionRate: Number(item.commission_rate),
      netAmount: Number(item.net_amount),
      status: item.status,
      note: item.note,
      createdAt: item.created_at,
    })),
  }
}

export async function listWorkers(query: WorkerListQuery) {
  const [rows] = await pool.query<WorkerRow[]>(
    `
      SELECT wp.id, wp.user_id, wp.service_area, wp.service_tags, wp.rating, wp.completed_order_count, wp.status, wp.created_at, wp.updated_at, u.real_name, u.phone
      FROM worker_profiles wp
      INNER JOIN users u ON u.id = wp.user_id
      ${query.status ? 'WHERE wp.status = :status' : ''}
      ORDER BY wp.updated_at DESC
    `,
    query.status ? { status: query.status } : undefined,
  )

  return rows.map(worker => ({
    id: worker.id,
    userId: worker.user_id,
    realName: worker.real_name,
    phone: worker.phone,
    serviceArea: worker.service_area,
    serviceTags: worker.service_tags ? JSON.parse(worker.service_tags) as string[] : [],
    rating: Number(worker.rating),
    completedOrderCount: worker.completed_order_count,
    status: worker.status,
    createdAt: worker.created_at,
    updatedAt: worker.updated_at,
  }))
}

export async function createWorker(input: CreateWorkerInput) {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const userId = await ensureUser(connection, input)
    const [existingProfiles] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM worker_profiles WHERE user_id = :userId LIMIT 1',
      { userId },
    )

    if (existingProfiles[0]?.id) {
      await connection.query(
        `
          UPDATE worker_profiles
          SET service_area = :serviceArea,
              service_tags = :serviceTags,
              status = 'active'
          WHERE id = :id
        `,
        {
          id: existingProfiles[0].id,
          serviceArea: input.serviceArea,
          serviceTags: JSON.stringify(input.serviceTags),
        },
      )

      await connection.commit()
      return existingProfiles[0].id as number
    }

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO worker_profiles (user_id, service_area, service_tags, status)
        VALUES (:userId, :serviceArea, :serviceTags, 'active')
      `,
      {
        userId,
        serviceArea: input.serviceArea,
        serviceTags: JSON.stringify(input.serviceTags),
      },
    )

    await connection.commit()
    return Number(result.insertId)
  }
  catch (error) {
    await connection.rollback()
    throw error
  }
  finally {
    connection.release()
  }
}

function mapOrderSummary(order: OrderRow) {
  return {
    id: order.id,
    orderNo: order.order_no,
    userId: order.user_id,
    userOpenId: order.user_open_id,
    workerProfileId: order.worker_profile_id,
    workerName: order.worker_name,
    serviceItemId: order.service_item_id,
    serviceCode: order.service_code,
    serviceName: order.service_name,
    tradeMode: order.service_trade_mode,
    city: order.city,
    district: order.district,
    contactName: order.contact_name,
    contactPhone: order.contact_phone,
    scheduledAt: order.scheduled_at,
    amount: Number(order.amount),
    status: order.status,
    refundStatus: order.refund_status,
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  }
}

function buildPaymentNo() {
  return `PAY${Date.now()}`
}