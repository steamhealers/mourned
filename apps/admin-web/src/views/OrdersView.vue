<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { getOrderStatusLabel, getRefundStatusLabel, orderStatuses, type OrderStatus } from '@mourned/domain'
import { ElMessage } from 'element-plus'
import { useAdminAccess } from '../lib/access'
import { completeAdminOrder, createOrderQuote, dispatchOrder, fetchOrderDetail, fetchOrders, fetchWorkers, reviewOrderRefund, triggerPaymentCallback, type OrderDto, type WorkerDto } from '../lib/api'

const { hasPermission } = useAdminAccess()
const loading = ref(false)
const items = ref<OrderDto[]>([])
const currentStatus = ref<'all' | OrderStatus>('all')
const drawerVisible = ref(false)
const detailLoading = ref(false)
const activeOrder = ref<OrderDto | null>(null)
const workers = ref<WorkerDto[]>([])

const quoteForm = reactive({
  quotedBy: '客服-王敏',
  amount: 1680,
  detailLabel: '基础礼仪咨询',
  detailValue: '680元',
  expiresAt: '2026-05-25T18:00:00.000Z',
})

const dispatchForm = reactive({
  workerProfileId: 1,
})

const refundForm = reactive({
  approved: true,
  note: '后台人工审核通过',
})

const filteredItems = computed(() => {
  if (currentStatus.value === 'all') {
    return items.value
  }

  return items.value.filter(item => item.status === currentStatus.value)
})

const statusOptions: Array<{ label: string, value: 'all' | OrderStatus }> = [
  { label: '全部', value: 'all' },
  ...orderStatuses.map(status => ({
    label: getOrderStatusLabel(status),
    value: status,
  })),
]

/**
 * 根据订单状态映射 Element Plus 标签风格。
 *
 * @param {OrderStatus} status 订单状态。
 * @returns {'success' | 'warning' | 'danger' | 'info'} 对应的标签类型。
 */
function getStatusTagType(status: OrderStatus) {
  if (status === 'completed' || status === 'refunded') {
    return 'success'
  }

  if (status === 'in_service' || status === 'pending_confirm' || status === 'refund_in_progress') {
    return 'warning'
  }

  if (status === 'closed') {
    return 'danger'
  }

  return 'info'
}

/**
 * 拉取订单列表，并维护页面级 loading 状态。
 *
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadOrders() {
  loading.value = true

  try {
    const response = await fetchOrders()
    items.value = response.items
  }
  finally {
    loading.value = false
  }
}

/**
 * 拉取代办员列表，供派单下拉框使用。
 *
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadWorkers() {
  const response = await fetchWorkers()
  workers.value = response.items
}

/**
 * 打开订单详情抽屉，并拉取指定订单的完整数据。
 *
 * @param {number} orderId 订单 id。
 * @returns {Promise<void>} 详情加载完成后的 Promise。
 */
async function openDetail(orderId: number) {
  drawerVisible.value = true
  detailLoading.value = true

  try {
    const response = await fetchOrderDetail(orderId)
    activeOrder.value = response.item
  }
  finally {
    detailLoading.value = false
  }
}

/**
 * 提交订单报价，并在成功后刷新详情与列表。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitQuote() {
  if (!activeOrder.value) {
    return
  }

  await createOrderQuote(activeOrder.value.id, {
    quotedBy: quoteForm.quotedBy,
    amount: quoteForm.amount,
    detail: [{ label: quoteForm.detailLabel, value: quoteForm.detailValue }],
    expiresAt: quoteForm.expiresAt,
  })

  ElMessage.success('报价已录入')
  await openDetail(activeOrder.value.id)
  await loadOrders()
}

/**
 * 提交派单操作，并在成功后刷新详情与列表。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitDispatch() {
  if (!activeOrder.value) {
    return
  }

  await dispatchOrder(activeOrder.value.id, dispatchForm.workerProfileId)
  ElMessage.success('已派单')
  await openDetail(activeOrder.value.id)
  await loadOrders()
}

/**
 * 模拟支付回调，便于后台联调订单支付状态。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function simulatePaymentCallback() {
  if (!activeOrder.value) {
    return
  }

  await triggerPaymentCallback(activeOrder.value.id, { paidAmount: activeOrder.value.amount })
  ElMessage.success('支付回调已模拟完成')
  await openDetail(activeOrder.value.id)
  await loadOrders()
}

/**
 * 提交退款审核结果，并在成功后刷新详情与列表。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitRefundReview() {
  if (!activeOrder.value) {
    return
  }

  await reviewOrderRefund(activeOrder.value.id, refundForm.approved, refundForm.note)
  ElMessage.success('退款审核已提交')
  await openDetail(activeOrder.value.id)
  await loadOrders()
}

/**
 * 执行后台强制完结，并在成功后刷新详情与列表。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function forceComplete() {
  if (!activeOrder.value) {
    return
  }

  await completeAdminOrder(activeOrder.value.id)
  ElMessage.success('订单已完结')
  await openDetail(activeOrder.value.id)
  await loadOrders()
}

/**
 * 页面挂载后初始化订单列表。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void loadOrders()
})

/**
 * 页面挂载后预加载代办员列表，供派单表单复用。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void loadWorkers()
})
</script>

<template>
  <section class="page-shell admin-page">
    <el-card shadow="hover">
      <template #header>
        <div class="panel-title">
          <span>订单管理</span>
          <el-segmented v-model="currentStatus" :options="statusOptions" />
        </div>
      </template>

      <el-table :data="filteredItems" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="150" />
        <el-table-column prop="serviceName" label="服务" min-width="160" />
        <el-table-column label="联系人" min-width="140">
          <template #default="scope">
            <div>{{ scope.row.contactName }}</div>
            <small>{{ scope.row.contactPhone }}</small>
          </template>
        </el-table-column>
        <el-table-column label="区域" width="160">
          <template #default="scope">{{ scope.row.city }} / {{ scope.row.district }}</template>
        </el-table-column>
        <el-table-column label="代办员" width="120">
          <template #default="scope">{{ scope.row.workerName ?? '待派单' }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="100" />
        <el-table-column prop="scheduledAt" label="预约时间" min-width="180" />
        <el-table-column prop="status" label="状态" width="140">
          <template #default="scope">
            <el-tag round :type="getStatusTagType(scope.row.status)">
              {{ getOrderStatusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button v-if="hasPermission('orders.detail')" link type="primary" @click="openDetail(scope.row.id)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="drawerVisible" title="订单详情与操作" size="50%">
      <div v-loading="detailLoading" class="order-detail" v-if="activeOrder">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ activeOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="服务">{{ activeOrder.serviceName }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ getOrderStatusLabel(activeOrder.status) }}</el-descriptions-item>
          <el-descriptions-item label="退款状态">{{ getRefundStatusLabel(activeOrder.refundStatus) }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ activeOrder.contactName }} / {{ activeOrder.contactPhone }}</el-descriptions-item>
          <el-descriptions-item label="预约时间">{{ activeOrder.scheduledAt }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ activeOrder.notes || '无' }}</el-descriptions-item>
        </el-descriptions>

        <el-card v-if="hasPermission('orders.quote')" shadow="never" class="detail-card">
          <template #header><span>报价录入</span></template>
          <el-form label-width="90px">
            <el-form-item label="报价人"><el-input v-model="quoteForm.quotedBy" /></el-form-item>
            <el-form-item label="金额"><el-input-number v-model="quoteForm.amount" :min="0" /></el-form-item>
            <el-form-item label="明细标签"><el-input v-model="quoteForm.detailLabel" /></el-form-item>
            <el-form-item label="明细内容"><el-input v-model="quoteForm.detailValue" /></el-form-item>
            <el-form-item label="到期时间"><el-input v-model="quoteForm.expiresAt" /></el-form-item>
            <el-button type="primary" @click="submitQuote">提交报价</el-button>
          </el-form>
        </el-card>

        <el-card v-if="hasPermission('orders.dispatch')" shadow="never" class="detail-card">
          <template #header><span>派单操作</span></template>
          <el-form inline>
            <el-form-item label="代办员">
              <el-select v-model="dispatchForm.workerProfileId" style="width: 220px">
                <el-option v-for="worker in workers" :key="worker.id" :label="`${worker.realName} / ${worker.serviceArea}`" :value="worker.id" />
              </el-select>
            </el-form-item>
            <el-button type="primary" @click="submitDispatch">派单</el-button>
          </el-form>
        </el-card>

        <el-card v-if="hasPermission('orders.payment-callback')" shadow="never" class="detail-card">
          <template #header><span>支付回调</span></template>
          <el-form inline>
            <el-form-item label="当前金额">
              <el-text>{{ activeOrder.amount }}</el-text>
            </el-form-item>
            <el-button type="primary" @click="simulatePaymentCallback">模拟微信支付回调</el-button>
          </el-form>
        </el-card>

        <el-card v-if="hasPermission('orders.refund-review') || hasPermission('orders.force-complete')" shadow="never" class="detail-card">
          <template #header><span>退款审核与完结</span></template>
          <el-form inline>
            <el-form-item v-if="hasPermission('orders.refund-review')" label="审核结果">
              <el-switch v-model="refundForm.approved" active-text="同意" inactive-text="驳回" />
            </el-form-item>
            <el-form-item v-if="hasPermission('orders.refund-review')" label="说明">
              <el-input v-model="refundForm.note" style="width: 280px" />
            </el-form-item>
            <el-button v-if="hasPermission('orders.refund-review')" @click="submitRefundReview">提交退款审核</el-button>
            <el-button v-if="hasPermission('orders.force-complete')" type="success" @click="forceComplete">强制完结</el-button>
          </el-form>
        </el-card>

        <el-card shadow="never" class="detail-card">
          <template #header><span>报价与履约记录</span></template>
          <el-timeline>
            <el-timeline-item v-for="quote in activeOrder.quotes || []" :key="`quote-${quote.id}`" type="warning">
              报价 {{ quote.amount }} / {{ quote.quotedBy }} / {{ quote.status }}
            </el-timeline-item>
            <el-timeline-item v-for="record in activeOrder.fulfillmentRecords || []" :key="`record-${record.id}`" type="primary">
              {{ record.stageCode }} - {{ record.description || '无说明' }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </div>
    </el-drawer>
  </section>
</template>