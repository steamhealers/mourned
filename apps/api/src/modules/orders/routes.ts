import type { FastifyInstance } from 'fastify'
import { requireAdminPermission, requirePermission, requirePermissionIfAdmin, requireSubjectType } from '../../lib/security'
import { registerUploadRoutes } from '../uploads/routes'
import {
  acceptOrder,
  acceptQuote,
  completeOrder,
  createWorkerSettlement,
  createFulfillmentRecord,
  createOrder,
  createQuote,
  createWorker,
  getFinanceOverview,
  getOrderDetail,
  handlePaymentCallback,
  listOrders,
  listServices,
  listWorkers,
  markOrderPaid,
  requestRefund,
  reviewWorker,
  reviewRefund,
} from './repository'
import {
  acceptOrderSchema,
  acceptQuoteSchema,
  createSettlementSchema,
  createFulfillmentSchema,
  createOrderSchema,
  createQuoteSchema,
  createWorkerSchema,
  markPaidSchema,
  orderListQuerySchema,
  paymentCallbackSchema,
  requestRefundSchema,
  reviewWorkerSchema,
  reviewRefundSchema,
  workerListQuerySchema,
} from './types'

/**
 * 注册订单、代办员、财务以及上传相关路由。
 *
 * @param {FastifyInstance} app Fastify 应用实例。
 * @returns {Promise<void>} 路由注册完成后的 Promise。
 */
export async function registerOrderRoutes(app: FastifyInstance) {
  await registerUploadRoutes(app)

  /**
   * 返回三端共用的服务目录列表。
   *
   * @returns {Promise<{ items: Awaited<ReturnType<typeof listServices>> }>} 服务列表响应。
   */
  app.get('/services', async () => ({
    items: await listServices(),
  }))

  /**
   * 按当前登录主体返回可见的订单列表。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ items: Awaited<ReturnType<typeof listOrders>> } | void>} 订单列表或提前结束。
   */
  app.get('/orders', async (request, reply) => {
    if (!requirePermissionIfAdmin(request, reply, 'orders:view')) {
      return
    }

    const query = orderListQuerySchema.parse(request.query)

    // 列表查询的“身份收口”放在路由层而不是前端：
    // 用户只能看自己的订单，代办员只能看派给自己的订单，避免继续信任客户端传参。
    if (request.authContext.subjectType === 'user') {
      query.openId = request.authContext.openId
      query.workerProfileId = undefined
    }

    if (request.authContext.subjectType === 'worker') {
      query.workerProfileId = request.authContext.workerProfileId
      query.openId = undefined
    }

    return {
      items: await listOrders(query),
    }
  })

  /**
   * 返回单个订单详情，并按主体身份校验资源归属。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof getOrderDetail>> } | import('fastify').FastifyReply | void>} 订单详情、错误响应或提前结束。
   */
  app.get('/orders/:orderId', async (request, reply) => {
    if (!requirePermissionIfAdmin(request, reply, 'orders.detail')) {
      return
    }

    const orderId = Number((request.params as { orderId: string }).orderId)
    const order = await getOrderDetail(orderId)

    if (!order) {
      return reply.code(404).send({ message: 'ORDER_NOT_FOUND' })
    }

    // 详情接口和列表接口一样，必须再次做资源归属校验；
    // 否则用户只要猜中订单 id，就能越权读到不属于自己的订单详情。
    if (request.authContext.subjectType === 'user' && order.userOpenId !== request.authContext.openId) {
      return reply.code(403).send({ message: 'FORBIDDEN' })
    }

    if (request.authContext.subjectType === 'worker' && order.workerProfileId !== request.authContext.workerProfileId) {
      return reply.code(403).send({ message: 'FORBIDDEN' })
    }

    return { item: order }
  })

  /**
   * 创建新订单，并在用户端场景下强制使用 token 内的 openId。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 创建结果响应或提前结束。
   */
  app.post('/orders', async (request, reply) => {
    if (!requireSubjectType(request, reply, ['user', 'admin'])) {
      return
    }

    const input = createOrderSchema.parse(request.body)

    // 用户端下单时，openId 最终以 token 中的身份为准，
    // 这样即便前端 body 被恶意篡改，也不能代替其他用户创建订单。
    if (request.authContext.subjectType === 'user' && request.authContext.openId) {
      input.openId = request.authContext.openId
    }

    try {
      const order = await createOrder(input)
      return reply.code(201).send({ item: order })
    }
    catch (error) {
      if (error instanceof Error && error.message === 'SERVICE_NOT_FOUND') {
        return reply.code(400).send({ message: error.message })
      }

      throw error
    }
  })

  /**
   * 为指定订单创建报价记录。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 创建结果响应或提前结束。
   */
  app.post('/orders/:orderId/quotes', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'orders.quote')) {
      return
    }

    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = createQuoteSchema.parse(request.body)
    const order = await createQuote(orderId, input)

    return reply.code(201).send({ item: order })
  })

  /**
   * 处理用户确认报价。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof acceptQuote>> } | void>} 更新后的订单结果或提前结束。
   */
  app.post('/orders/:orderId/quote-acceptance', async (request, reply) => {
    if (!requireSubjectType(request, reply, ['user'])) {
      return
    }

    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = acceptQuoteSchema.parse(request.body)

    return {
      item: await acceptQuote(orderId, input),
    }
  })

  /**
   * 记录用户侧支付动作。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof markOrderPaid>> } | void>} 支付结果或提前结束。
   */
  app.post('/orders/:orderId/payment', async (request, reply) => {
    if (!requireSubjectType(request, reply, ['user'])) {
      return
    }

    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = markPaidSchema.parse(request.body)

    return {
      item: await markOrderPaid(orderId, input),
    }
  })

  /**
   * 处理后台模拟支付回调。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof handlePaymentCallback>> } | void>} 回调处理结果或提前结束。
   */
  app.post('/orders/:orderId/payment-callback', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'orders.payment-callback')) {
      return
    }

    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = paymentCallbackSchema.parse(request.body)

    return {
      item: await handlePaymentCallback(orderId, input),
    }
  })

  /**
   * 处理代办员接单或后台派单。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof acceptOrder>> } | void>} 接单结果或提前结束。
   */
  app.post('/orders/:orderId/accept', async (request, reply) => {
    if (!requireSubjectType(request, reply, ['worker', 'admin'])) {
      return
    }

    if (!requirePermissionIfAdmin(request, reply, 'orders.dispatch')) {
      return
    }

    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = acceptOrderSchema.parse(request.body)

    // 代办员自助接单时，workerProfileId 同样以 token 身份为准；
    // 管理端派单仍然允许显式传入目标代办员 id。
    if (request.authContext.subjectType === 'worker' && request.authContext.workerProfileId) {
      input.workerProfileId = request.authContext.workerProfileId
    }

    return {
      item: await acceptOrder(orderId, input),
    }
  })

  /**
   * 创建订单履约记录。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 创建结果响应或提前结束。
   */
  app.post('/orders/:orderId/fulfillment', async (request, reply) => {
    if (!requireSubjectType(request, reply, ['worker'])) {
      return
    }

    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = createFulfillmentSchema.parse(request.body)

    return reply.code(201).send({ item: await createFulfillmentRecord(orderId, input) })
  })

  /**
   * 完成订单；用户可确认自己的待确认订单，管理员可执行强制完结。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof completeOrder>> } | void>} 完结结果或提前结束。
   */
  app.post('/orders/:orderId/complete', async (request, reply) => {
    if (!requireSubjectType(request, reply, ['user', 'admin'])) {
      return
    }

    if (!requirePermissionIfAdmin(request, reply, 'orders.force-complete')) {
      return
    }

    const orderId = Number((request.params as { orderId: string }).orderId)

    if (request.authContext.subjectType === 'user') {
      const order = await getOrderDetail(orderId)

      if (!order) {
        return reply.code(404).send({ message: 'ORDER_NOT_FOUND' })
      }

      if (order.userOpenId !== request.authContext.openId) {
        return reply.code(403).send({ message: 'FORBIDDEN' })
      }

      if (order.status !== 'pending_confirm') {
        return reply.code(409).send({ message: 'ORDER_STATUS_INVALID' })
      }
    }

    return {
      item: await completeOrder(orderId),
    }
  })

  /**
   * 提交退款申请。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof requestRefund>> } | void>} 退款申请结果或提前结束。
   */
  app.post('/orders/:orderId/refund-request', async (request, reply) => {
    if (!requireSubjectType(request, reply, ['user'])) {
      return
    }

    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = requestRefundSchema.parse(request.body)

    return {
      item: await requestRefund(orderId, input),
    }
  })

  /**
   * 审核退款申请。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof reviewRefund>> } | void>} 审核结果或提前结束。
   */
  app.post('/orders/:orderId/refund-review', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'orders.refund-review')) {
      return
    }

    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = reviewRefundSchema.parse(request.body)

    return {
      item: await reviewRefund(orderId, input),
    }
  })

  /**
   * 返回后台可见的代办员列表。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ items: Awaited<ReturnType<typeof listWorkers>> } | void>} 代办员列表或提前结束。
   */
  app.get('/workers', async (request, reply) => {
    // 当前接口仍然是“后台专属读接口”；
    // 非 admin 直接返回空列表，而不是暴露代办员名册结构。
    if (request.authContext.subjectType !== 'admin') {
      return {
        items: [],
      }
    }

    if (!requirePermission(request, reply, 'workers:view')) {
      return
    }

    const query = workerListQuerySchema.parse(request.query)

    return {
      items: await listWorkers(query),
    }
  })

  /**
   * 创建代办员档案。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 创建结果响应或提前结束。
   */
  app.post('/workers', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'workers.create')) {
      return
    }

    const input = createWorkerSchema.parse(request.body)
    const workerProfileId = await createWorker(input)

    return reply.code(201).send({ workerProfileId })
  })

  /**
   * 更新代办员审核状态。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ success: true } | void>} 更新结果或提前结束。
   */
  app.post('/workers/:workerProfileId/review', async (request, reply) => {
    const workerProfileId = Number((request.params as { workerProfileId: string }).workerProfileId)
    const input = reviewWorkerSchema.parse(request.body)

    const requiredPermission = input.status === 'active'
      ? 'workers.approve'
      : input.status === 'pending'
        ? 'workers.pending'
        : 'workers.freeze'

    if (!requireAdminPermission(request, reply, requiredPermission)) {
      return
    }

    await reviewWorker(workerProfileId, input)
    return { success: true }
  })

  /**
   * 为代办员生成结算单。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 创建结果响应或提前结束。
   */
  app.post('/workers/:workerProfileId/settlements', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'workers.settlement')) {
      return
    }

    const workerProfileId = Number((request.params as { workerProfileId: string }).workerProfileId)
    const input = createSettlementSchema.parse(request.body)

    await createWorkerSettlement(workerProfileId, input)
    return reply.code(201).send({ success: true })
  })

  /**
   * 返回后台财务总览聚合数据。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<Awaited<ReturnType<typeof getFinanceOverview>> | void>} 财务总览或提前结束。
   */
  app.get('/finance/overview', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'finance:view')) {
      return
    }

    // 财务概览属于高敏感聚合视图，先只允许后台主体访问；
    // 如果后续做角色细分，这里再叠加具体 permission code 即可。
    return getFinanceOverview()
  })
}