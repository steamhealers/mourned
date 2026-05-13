<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { completeAdminOrder, createOrderQuote, dispatchOrder, fetchOrderDetail, fetchOrders, fetchWorkers, reviewOrderRefund, triggerPaymentCallback, type OrderDto, type WorkerDto } from '../lib/api'

const loading = ref(false)
const items = ref<OrderDto[]>([])
const currentStatus = ref('all')
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

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '待报价', value: 'pending_quote' },
  { label: '待派单', value: 'pending_dispatch' },
  { label: '服务中', value: 'in_service' },
  { label: '待确认', value: 'pending_confirm' },
  { label: '已完成', value: 'completed' },
]

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

async function loadWorkers() {
  const response = await fetchWorkers()
  workers.value = response.items
}

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

async function submitDispatch() {
  if (!activeOrder.value) {
    return
  }

  await dispatchOrder(activeOrder.value.id, dispatchForm.workerProfileId)
  ElMessage.success('已派单')
  await openDetail(activeOrder.value.id)
  await loadOrders()
}

async function simulatePaymentCallback() {
  if (!activeOrder.value) {
    return
  }

  await triggerPaymentCallback(activeOrder.value.id, { paidAmount: activeOrder.value.amount })
  ElMessage.success('支付回调已模拟完成')
  await openDetail(activeOrder.value.id)
  await loadOrders()
}

async function submitRefundReview() {
  if (!activeOrder.value) {
    return
  }

  await reviewOrderRefund(activeOrder.value.id, refundForm.approved, refundForm.note)
  ElMessage.success('退款审核已提交')
  await openDetail(activeOrder.value.id)
  await loadOrders()
}

async function forceComplete() {
  if (!activeOrder.value) {
    return
  }

  await completeAdminOrder(activeOrder.value.id)
  ElMessage.success('订单已完结')
  await openDetail(activeOrder.value.id)
  await loadOrders()
}

onMounted(loadOrders)
onMounted(loadWorkers)
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
            <el-tag round :type="scope.row.status === 'completed' ? 'success' : scope.row.status === 'in_service' ? 'warning' : 'info'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="openDetail(scope.row.id)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="drawerVisible" title="订单详情与操作" size="50%">
      <div v-loading="detailLoading" class="order-detail" v-if="activeOrder">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ activeOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="服务">{{ activeOrder.serviceName }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ activeOrder.status }}</el-descriptions-item>
          <el-descriptions-item label="退款状态">{{ activeOrder.refundStatus }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ activeOrder.contactName }} / {{ activeOrder.contactPhone }}</el-descriptions-item>
          <el-descriptions-item label="预约时间">{{ activeOrder.scheduledAt }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ activeOrder.notes || '无' }}</el-descriptions-item>
        </el-descriptions>

        <el-card shadow="never" class="detail-card">
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

        <el-card shadow="never" class="detail-card">
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

        <el-card shadow="never" class="detail-card">
          <template #header><span>支付回调</span></template>
          <el-form inline>
            <el-form-item label="当前金额">
              <el-text>{{ activeOrder.amount }}</el-text>
            </el-form-item>
            <el-button type="primary" @click="simulatePaymentCallback">模拟微信支付回调</el-button>
          </el-form>
        </el-card>

        <el-card shadow="never" class="detail-card">
          <template #header><span>退款审核与完结</span></template>
          <el-form inline>
            <el-form-item label="审核结果">
              <el-switch v-model="refundForm.approved" active-text="同意" inactive-text="驳回" />
            </el-form-item>
            <el-form-item label="说明">
              <el-input v-model="refundForm.note" style="width: 280px" />
            </el-form-item>
            <el-button @click="submitRefundReview">提交退款审核</el-button>
            <el-button type="success" @click="forceComplete">强制完结</el-button>
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