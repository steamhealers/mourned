<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchOrders, type OrderDto } from '../../lib/api'

const loading = ref(false)
const orders = ref<OrderDto[]>([])

async function loadOrders() {
  loading.value = true

  try {
    const response = await fetchOrders('user-demo-001')
    orders.value = response.items
  }
  finally {
    loading.value = false
  }
}

onMounted(loadOrders)

function openDetail(orderId: number) {
  uni.navigateTo({
    url: `/pages/order-detail/index?orderId=${orderId}`,
  })
}
</script>

<template>
  <view class="page">
    <van-loading v-if="loading" size="24px" vertical>加载订单中</van-loading>

    <van-empty v-else-if="orders.length === 0" description="暂无订单" />

    <view v-else class="order-list">
      <view v-for="item in orders" :key="item.id" class="order-card">
        <view class="order-card__header">
          <text class="order-card__title">{{ item.serviceName }}</text>
          <van-tag type="primary" plain>{{ item.status }}</van-tag>
        </view>
        <text class="order-card__meta">订单号 {{ item.orderNo }}</text>
        <text class="order-card__meta">{{ item.city }} / {{ item.district }} · {{ item.scheduledAt }}</text>
        <text class="order-card__desc">{{ item.notes || '无备注' }}</text>
        <van-button size="small" plain type="primary" @click="openDetail(item.id)">查看详情</van-button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 32rpx;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.order-card {
  padding: 28rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 30rpx rgba(49, 38, 27, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.order-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}

.order-card__title {
  font-size: 30rpx;
  font-weight: 600;
}

.order-card__meta,
.order-card__desc {
  color: #5a4d43;
  line-height: 1.6;
}
</style>