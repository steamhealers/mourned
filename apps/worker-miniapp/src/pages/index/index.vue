<script setup lang="ts">
import { fulfillmentStages, workerDashboard } from '@mourned/domain'

function goToOrders() {
  uni.navigateTo({
    url: '/pages/orders/index',
  })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__title">代办员工作台</text>
      <text class="hero__desc">围绕接单、到场、履约上传和异常上报组织首期流程。</text>
    </view>

    <van-notice-bar left-icon="info-o" text="代办员端已接入 Vant Weapp，后续将补充接单、打卡、异常上报等表单流。" />

    <van-grid :column-num="2" :border="false" gutter="12">
      <van-grid-item v-for="item in workerDashboard" :key="item.label">
        <view class="summary-grid__item">
          <text class="summary-grid__value">{{ item.value }}</text>
          <text class="summary-grid__label">{{ item.label }}</text>
        </view>
      </van-grid-item>
    </van-grid>

    <view class="section">
      <text class="section__title">履约节点</text>
      <van-steps direction="vertical" :active="fulfillmentStages.length - 1">
        <van-step v-for="stage in fulfillmentStages" :key="stage.code">
          <view class="timeline__item">
            <text class="timeline__name">{{ stage.name }}</text>
            <text class="timeline__desc">{{ stage.description }}</text>
          </view>
        </van-step>
      </van-steps>
    </view>

    <van-button type="primary" block @click="goToOrders">进入接单与履约</van-button>
  </view>
</template>

<style scoped>
.page {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.hero {
  padding: 32rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #332820, #7b5d46);
  color: #f8f3ee;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.hero__title {
  font-size: 38rpx;
  font-weight: 600;
}

.hero__desc {
  font-size: 25rpx;
  line-height: 1.7;
}

.summary-grid {
  display: flex;
  flex-direction: column;
}

.summary-grid__item,
.timeline__item {
  padding: 28rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 26rpx rgba(56, 39, 21, 0.08);
}

.summary-grid__value {
  font-size: 36rpx;
  font-weight: 600;
}

.summary-grid__label {
  margin-top: 12rpx;
  display: block;
  font-size: 22rpx;
  color: #7f6a59;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.section__title,
.timeline__name {
  font-size: 28rpx;
  font-weight: 600;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.page :deep(.van-notice-bar) {
  border-radius: 18rpx;
}

.page :deep(.van-grid-item__content) {
  padding: 0;
  background: transparent;
}

.page :deep(.van-step__circle-container) {
  background: #f6f1ea;
}

.timeline__desc {
  margin-top: 10rpx;
  display: block;
  font-size: 23rpx;
  line-height: 1.6;
  color: #524538;
}
</style>