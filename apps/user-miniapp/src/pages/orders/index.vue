<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getOrderStatusLabel, type OrderStatus } from '@mourned/domain'
import { fetchOrders, type OrderDto } from '../../lib/api'
import { getCurrentUserSession } from '../../lib/session'

const loading = ref(false)
const orders = ref<OrderDto[]>([])
const pageError = ref('')

/**
 * 将接口错误统一转换为用户端更易理解的中文提示。
 *
 * @param {unknown} error 请求过程中抛出的错误对象。
 * @returns {string} 可直接展示给用户的错误提示。
 */
function resolveErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.includes('401')) {
    return '登录状态已失效，请重新进入页面'
  }

  return '订单列表加载失败，请稍后重试'
}

/**
 * 根据订单状态映射 Vant 标签风格。
 *
 * @param {OrderStatus} status 订单状态。
 * @returns {'success' | 'warning' | 'danger' | 'primary'} 标签类型。
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

  return 'primary'
}

/**
 * 拉取当前用户的订单列表，并维护页面级 loading 状态。
 *
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadOrders() {
  loading.value = true
  pageError.value = ''

  try {
    const session = getCurrentUserSession()
    const response = await fetchOrders(session.openId)
    orders.value = response.items
  }
  catch (error) {
    orders.value = []
    pageError.value = resolveErrorMessage(error)
  }
  finally {
    loading.value = false
  }
}

/**
 * 页面挂载后初始化当前用户订单列表。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void loadOrders()
})

/**
 * 跳转到订单详情页。
 *
 * @param {number} orderId 订单 id。
 * @returns {void}
 */
function openDetail(orderId: number) {
  uni.navigateTo({
    url: `/pages/order-detail/index?orderId=${orderId}`,
  })
}
</script>

<template>
  <view class="page">
    <van-loading v-if="loading" size="24px" vertical>加载订单中</van-loading>

    <view v-else-if="pageError" class="order-card">
      <text class="order-card__title">订单暂不可用</text>
      <text class="order-card__meta">{{ pageError }}</text>
      <van-button size="small" type="primary" @click="loadOrders">重新加载</van-button>
    </view>

    <van-empty v-else-if="orders.length === 0" description="暂无订单" />

    <view v-else class="order-list">
      <view v-for="item in orders" :key="item.id" class="order-card">
        <view class="order-card__header">
          <text class="order-card__title">{{ item.serviceName }}</text>
          <van-tag :type="getStatusTagType(item.status)" plain>{{ getOrderStatusLabel(item.status) }}</van-tag>
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