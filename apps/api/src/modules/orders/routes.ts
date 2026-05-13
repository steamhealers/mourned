import type { FastifyInstance } from 'fastify'
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

export async function registerOrderRoutes(app: FastifyInstance) {
  await registerUploadRoutes(app)

  app.get('/services', async () => ({
    items: await listServices(),
  }))

  app.get('/orders', async (request) => {
    const query = orderListQuerySchema.parse(request.query)

    return {
      items: await listOrders(query),
    }
  })

  app.get('/orders/:orderId', async (request, reply) => {
    const orderId = Number((request.params as { orderId: string }).orderId)
    const order = await getOrderDetail(orderId)

    if (!order) {
      return reply.code(404).send({ message: 'ORDER_NOT_FOUND' })
    }

    return { item: order }
  })

  app.post('/orders', async (request, reply) => {
    const input = createOrderSchema.parse(request.body)

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

  app.post('/orders/:orderId/quotes', async (request, reply) => {
    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = createQuoteSchema.parse(request.body)
    const order = await createQuote(orderId, input)

    return reply.code(201).send({ item: order })
  })

  app.post('/orders/:orderId/quote-acceptance', async (request) => {
    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = acceptQuoteSchema.parse(request.body)

    return {
      item: await acceptQuote(orderId, input),
    }
  })

  app.post('/orders/:orderId/payment', async (request) => {
    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = markPaidSchema.parse(request.body)

    return {
      item: await markOrderPaid(orderId, input),
    }
  })

  app.post('/orders/:orderId/payment-callback', async (request) => {
    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = paymentCallbackSchema.parse(request.body)

    return {
      item: await handlePaymentCallback(orderId, input),
    }
  })

  app.post('/orders/:orderId/accept', async (request) => {
    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = acceptOrderSchema.parse(request.body)

    return {
      item: await acceptOrder(orderId, input),
    }
  })

  app.post('/orders/:orderId/fulfillment', async (request, reply) => {
    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = createFulfillmentSchema.parse(request.body)

    return reply.code(201).send({ item: await createFulfillmentRecord(orderId, input) })
  })

  app.post('/orders/:orderId/complete', async (request) => {
    const orderId = Number((request.params as { orderId: string }).orderId)

    return {
      item: await completeOrder(orderId),
    }
  })

  app.post('/orders/:orderId/refund-request', async (request) => {
    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = requestRefundSchema.parse(request.body)

    return {
      item: await requestRefund(orderId, input),
    }
  })

  app.post('/orders/:orderId/refund-review', async (request) => {
    const orderId = Number((request.params as { orderId: string }).orderId)
    const input = reviewRefundSchema.parse(request.body)

    return {
      item: await reviewRefund(orderId, input),
    }
  })

  app.get('/workers', async (request) => {
    const query = workerListQuerySchema.parse(request.query)

    return {
      items: await listWorkers(query),
    }
  })

  app.post('/workers', async (request, reply) => {
    const input = createWorkerSchema.parse(request.body)
    const workerProfileId = await createWorker(input)

    return reply.code(201).send({ workerProfileId })
  })

  app.post('/workers/:workerProfileId/review', async (request) => {
    const workerProfileId = Number((request.params as { workerProfileId: string }).workerProfileId)
    const input = reviewWorkerSchema.parse(request.body)

    await reviewWorker(workerProfileId, input)
    return { success: true }
  })

  app.post('/workers/:workerProfileId/settlements', async (request, reply) => {
    const workerProfileId = Number((request.params as { workerProfileId: string }).workerProfileId)
    const input = createSettlementSchema.parse(request.body)

    await createWorkerSettlement(workerProfileId, input)
    return reply.code(201).send({ success: true })
  })

  app.get('/finance/overview', async () => {
    return getFinanceOverview()
  })
}