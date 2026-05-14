<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, reactive, ref } from 'vue'
import { getOrderStatusLabel, getRefundStatusLabel } from '@mourned/domain'
import { acceptQuote, completeOrder, fetchOrderDetail, markOrderPaid, requestRefundWithEvidence, uploadImage, type OrderDto } from '../../lib/api'

const loading = ref(false)
const order = ref<OrderDto | null>(null)
const pageError = ref('')
const actionLoading = ref(false)
const refundReason = ref('行程变更，申请退款')
const refundEvidenceUrls = ref<string[]>([])
const uploadLoading = ref(false)
const currentOrderId = ref<number | null>(null)

// 当前优先操作的报价 id，默认优先取待确认报价，否则回退到第一条报价。
const activeQuoteId = computed(() => order.value?.quotes?.find(item => item.status === 'submitted')?.id ?? order.value?.quotes?.[0]?.id)

const paymentState = reactive({
  amount: 0,
})

// 只有待报价订单且存在可用报价时，才允许展示确认报价按钮。
const canAcceptQuote = computed(() => order.value?.status === 'pending_quote' && Boolean(activeQuoteId.value))

// 只有待支付订单才允许展示支付占位操作。
const canPay = computed(() => order.value?.status === 'pending_payment')

// 只有待用户确认完成的订单才允许展示完结按钮。
const canConfirmComplete = computed(() => order.value?.status === 'pending_confirm')

// 已退款、退款中或已关闭的订单不允许再次发起退款。
const canRequestRefund = computed(() => {
  if (!order.value) {
    return false
  }

  return !['refund_in_progress', 'refunded', 'closed'].includes(order.value.status)
})

/**
 * 将接口错误统一转换为用户端更易理解的中文提示。
 *
 * @param {unknown} error 请求过程中抛出的错误对象。
 * @param {string} fallback 默认兜底提示。
 * @returns {string} 可直接展示给用户的错误提示。
 */
function resolveErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback
  }

  if (error.message.includes('404')) {
    return '订单不存在或已不可访问'
  }

  if (error.message.includes('403')) {
    return '当前订单暂不允许此操作'
  }

  if (error.message.includes('409')) {
    return '当前订单状态已变化，请刷新后重试'
  }

  if (error.message.includes('500')) {
    return '服务暂时不可用，请稍后重试'
  }

  return fallback
}

/**
 * 拉取指定订单详情，并同步支付占位金额。
 *
 * @param {number} orderId 订单 id。
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadOrder(orderId: number) {
  loading.value = true
  pageError.value = ''

  try {
    const response = await fetchOrderDetail(orderId)
    order.value = response.item
    paymentState.amount = response.item.amount
  }
  catch (error) {
    order.value = null
    pageError.value = resolveErrorMessage(error, '订单详情加载失败')
  }
  finally {
    loading.value = false
  }
}

/**
 * 确认采用当前可用报价。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function handleAcceptQuote() {
  if (!order.value || !activeQuoteId.value) {
    return
  }

  actionLoading.value = true

  try {
    await acceptQuote(order.value.id, activeQuoteId.value)
    await loadOrder(order.value.id)
    uni.showToast({ title: '报价已确认', icon: 'success' })
  }
  catch (error) {
    uni.showToast({ title: resolveErrorMessage(error, '确认报价失败'), icon: 'none' })
  }
  finally {
    actionLoading.value = false
  }
}

/**
 * 标记订单已支付。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function handlePay() {
  if (!order.value) {
    return
  }

  if (!(paymentState.amount > 0)) {
    uni.showToast({ title: '支付金额必须大于 0', icon: 'none' })
    return
  }

  actionLoading.value = true

  try {
    await markOrderPaid(order.value.id, paymentState.amount)
    await loadOrder(order.value.id)
    uni.showToast({ title: '已标记支付', icon: 'success' })
  }
  catch (error) {
    uni.showToast({ title: resolveErrorMessage(error, '支付标记失败'), icon: 'none' })
  }
  finally {
    actionLoading.value = false
  }
}

/**
 * 提交退款申请及已上传凭证。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function handleRefund() {
  if (!order.value) {
    return
  }

  if (!refundReason.value.trim()) {
    uni.showToast({ title: '请先填写退款原因', icon: 'none' })
    return
  }

  actionLoading.value = true

  try {
    await requestRefundWithEvidence(order.value.id, refundReason.value.trim(), refundEvidenceUrls.value)
    await loadOrder(order.value.id)
    uni.showToast({ title: '退款申请已提交', icon: 'success' })
  }
  catch (error) {
    uni.showToast({ title: resolveErrorMessage(error, '退款申请提交失败'), icon: 'none' })
  }
  finally {
    actionLoading.value = false
  }
}

/**
 * 选择并上传退款举证图片。
 *
 * @returns {Promise<void>} 上传完成后的 Promise。
 */
async function handleUploadRefundEvidence() {
  uploadLoading.value = true

  try {
    const chooseResult = await uni.chooseImage({
      count: 3,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    const tempFilePaths = Array.isArray(chooseResult.tempFilePaths)
      ? chooseResult.tempFilePaths
      : [chooseResult.tempFilePaths]

    const uploadedUrls = await Promise.all(tempFilePaths.map(filePath => uploadImage(filePath)))
    refundEvidenceUrls.value = [...refundEvidenceUrls.value, ...uploadedUrls].slice(0, 9)
    uni.showToast({ title: '凭证已上传', icon: 'success' })
  }
  catch (error) {
    uni.showToast({ title: resolveErrorMessage(error, '凭证上传失败'), icon: 'none' })
  }
  finally {
    uploadLoading.value = false
  }
}

/**
 * 确认订单履约完成。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function handleConfirmComplete() {
  if (!order.value) {
    return
  }

  actionLoading.value = true

  try {
    await completeOrder(order.value.id)
    await loadOrder(order.value.id)
    uni.showToast({ title: '已确认完成', icon: 'success' })
  }
  catch (error) {
    uni.showToast({ title: resolveErrorMessage(error, '确认完成失败'), icon: 'none' })
  }
  finally {
    actionLoading.value = false
  }
}

/**
 * 返回订单列表页。
 *
 * @returns {void} 无返回值。
 */
function goToOrders() {
  uni.navigateTo({ url: '/pages/orders/index' })
}

/**
 * 在页面加载时读取路由参数中的订单 id，并触发详情拉取。
 *
 * @param {{ orderId?: string }} query 页面路由参数。
 * @returns {void}
 */
onLoad((query) => {
  const orderId = Number(query?.orderId)
  if (orderId) {
    currentOrderId.value = orderId
    void loadOrder(orderId)
    return
  }

  pageError.value = '订单参数无效，请返回列表重新进入'
})
</script>

<template>
  <view class="page">
    <van-loading v-if="loading" size="24px" vertical>加载详情中</van-loading>

    <view v-else-if="pageError" class="card">
      <text class="title">订单不可用</text>
      <text class="meta">{{ pageError }}</text>
      <van-button v-if="currentOrderId" plain type="primary" block @click="loadOrder(currentOrderId!)">重新加载</van-button>
      <van-button plain block @click="goToOrders">返回订单列表</van-button>
    </view>

    <template v-else-if="order">
      <view class="card">
        <text class="title">{{ order.serviceName }}</text>
        <text class="meta">订单号 {{ order.orderNo }}</text>
        <text class="meta">状态 {{ getOrderStatusLabel(order.status) }} / 退款 {{ getRefundStatusLabel(order.refundStatus) }}</text>
        <text class="meta">{{ order.city }} / {{ order.district }} / {{ order.scheduledAt }}</text>
      </view>

      <view class="card" v-if="order.quotes?.length">
        <text class="title">报价单</text>
        <view v-for="quote in order.quotes" :key="quote.id" class="quote-row">
          <text>{{ quote.quotedBy }} · {{ quote.amount }} · {{ quote.status }}</text>
        </view>
        <van-button v-if="canAcceptQuote" type="primary" block :loading="actionLoading" @click="handleAcceptQuote">确认报价</van-button>
      </view>

      <view class="card" v-if="canPay">
        <text class="title">支付占位</text>
        <van-field :value="String(paymentState.amount)" label="金额" type="digit" @change="paymentState.amount = Number($event.detail)" />
        <van-button type="primary" block :loading="actionLoading" @click="handlePay">标记已支付</van-button>
      </view>

      <view class="card" v-if="order.fulfillmentRecords?.length">
        <text class="title">履约记录</text>
        <view v-for="record in order.fulfillmentRecords" :key="record.id" class="quote-row">
          <text>{{ record.stageCode }} · {{ record.description || '无说明' }}</text>
        </view>
        <van-button v-if="canConfirmComplete" plain type="success" block :loading="actionLoading" @click="handleConfirmComplete">确认服务完成</van-button>
      </view>

      <view class="card" v-if="canRequestRefund">
        <text class="title">售后申请</text>
        <van-field :value="refundReason" type="textarea" autosize label="原因" @change="refundReason = $event.detail" />
        <van-button plain type="primary" block :loading="uploadLoading" @click="handleUploadRefundEvidence">上传退款凭证</van-button>
        <view v-if="refundEvidenceUrls.length" class="evidence-list">
          <text v-for="url in refundEvidenceUrls" :key="url" class="meta">{{ url }}</text>
        </view>
        <van-button plain type="danger" block :loading="actionLoading" @click="handleRefund">申请退款</van-button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.card {
  padding: 28rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 30rpx rgba(49, 38, 27, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.title {
  font-size: 30rpx;
  font-weight: 600;
}

.meta,
.quote-row {
  color: #5a4d43;
  line-height: 1.6;
}

.evidence-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
</style>