<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, reactive, ref } from 'vue'
import { acceptQuote, completeOrder, fetchOrderDetail, markOrderPaid, requestRefundWithEvidence, uploadImage, type OrderDto } from '../../lib/api'

const loading = ref(false)
const order = ref<OrderDto | null>(null)
const refundReason = ref('行程变更，申请退款')
const refundEvidenceUrls = ref<string[]>([])
const uploadLoading = ref(false)
const activeQuoteId = computed(() => order.value?.quotes?.find(item => item.status === 'submitted')?.id ?? order.value?.quotes?.[0]?.id)

const paymentState = reactive({
  amount: 0,
})

async function loadOrder(orderId: number) {
  loading.value = true

  try {
    const response = await fetchOrderDetail(orderId)
    order.value = response.item
    paymentState.amount = response.item.amount
  }
  finally {
    loading.value = false
  }
}

async function handleAcceptQuote() {
  if (!order.value || !activeQuoteId.value) {
    return
  }

  await acceptQuote(order.value.id, activeQuoteId.value)
  await loadOrder(order.value.id)
  uni.showToast({ title: '报价已确认', icon: 'success' })
}

async function handlePay() {
  if (!order.value) {
    return
  }

  await markOrderPaid(order.value.id, paymentState.amount)
  await loadOrder(order.value.id)
  uni.showToast({ title: '已标记支付', icon: 'success' })
}

async function handleRefund() {
  if (!order.value) {
    return
  }

  await requestRefundWithEvidence(order.value.id, refundReason.value, refundEvidenceUrls.value)
  await loadOrder(order.value.id)
  uni.showToast({ title: '退款申请已提交', icon: 'success' })
}

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
  finally {
    uploadLoading.value = false
  }
}

async function handleConfirmComplete() {
  if (!order.value) {
    return
  }

  await completeOrder(order.value.id)
  await loadOrder(order.value.id)
  uni.showToast({ title: '已确认完成', icon: 'success' })
}

onLoad((query) => {
  const orderId = Number(query?.orderId)
  if (orderId) {
    void loadOrder(orderId)
  }
})
</script>

<template>
  <view class="page">
    <van-loading v-if="loading" size="24px" vertical>加载详情中</van-loading>

    <template v-else-if="order">
      <view class="card">
        <text class="title">{{ order.serviceName }}</text>
        <text class="meta">订单号 {{ order.orderNo }}</text>
        <text class="meta">状态 {{ order.status }} / 退款 {{ order.refundStatus || 'none' }}</text>
        <text class="meta">{{ order.city }} / {{ order.district }} / {{ order.scheduledAt }}</text>
      </view>

      <view class="card" v-if="order.quotes?.length">
        <text class="title">报价单</text>
        <view v-for="quote in order.quotes" :key="quote.id" class="quote-row">
          <text>{{ quote.quotedBy }} · {{ quote.amount }} · {{ quote.status }}</text>
        </view>
        <van-button type="primary" block @click="handleAcceptQuote">确认报价</van-button>
      </view>

      <view class="card">
        <text class="title">支付占位</text>
        <van-field :value="String(paymentState.amount)" label="金额" type="digit" @change="paymentState.amount = Number($event.detail)" />
        <van-button type="primary" block @click="handlePay">标记已支付</van-button>
      </view>

      <view class="card" v-if="order.fulfillmentRecords?.length">
        <text class="title">履约记录</text>
        <view v-for="record in order.fulfillmentRecords" :key="record.id" class="quote-row">
          <text>{{ record.stageCode }} · {{ record.description || '无说明' }}</text>
        </view>
        <van-button plain type="success" block @click="handleConfirmComplete">确认服务完成</van-button>
      </view>

      <view class="card">
        <text class="title">售后申请</text>
        <van-field :value="refundReason" type="textarea" autosize label="原因" @change="refundReason = $event.detail" />
        <van-button plain type="primary" block :loading="uploadLoading" @click="handleUploadRefundEvidence">上传退款凭证</van-button>
        <view v-if="refundEvidenceUrls.length" class="evidence-list">
          <text v-for="url in refundEvidenceUrls" :key="url" class="meta">{{ url }}</text>
        </view>
        <van-button plain type="danger" block @click="handleRefund">申请退款</van-button>
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