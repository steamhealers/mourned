<script setup lang="ts">
import { serviceCatalog, userQuickActions } from '@mourned/domain'
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__eyebrow">Mourned</text>
      <text class="hero__title">异地祭扫与白事协办</text>
      <text class="hero__desc">先交付代祭扫、跑腿代办和咨询报价，所有进度可追踪，关键节点有履约凭证。</text>
    </view>

    <van-notice-bar left-icon="volume-o" text="当前演示接入 Vant Weapp，首期默认开放代祭扫、跑腿代办与咨询报价。" />

    <view class="section">
      <text class="section__title">服务入口</text>
      <van-cell-group inset>
        <van-cell v-for="item in serviceCatalog" :key="item.code" :title="item.name" :label="item.description" is-link>
          <template #value>
            <van-tag plain type="primary">{{ item.tradeMode }}</van-tag>
          </template>
        </van-cell>
      </van-cell-group>
    </view>

    <view class="section">
      <text class="section__title">当前阶段能力</text>
      <van-cell-group inset>
        <van-cell v-for="item in userQuickActions" :key="item.title" :title="item.title" :label="item.description" />
      </van-cell-group>
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.hero {
  padding: 36rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #1f1a17, #5c4a3d);
  color: #f7f0e7;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.hero__eyebrow {
  font-size: 22rpx;
  opacity: 0.72;
}

.hero__title {
  font-size: 40rpx;
  font-weight: 600;
}

.hero__desc {
  font-size: 26rpx;
  line-height: 1.7;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.section__title {
  font-size: 30rpx;
  font-weight: 600;
}

.page :deep(.van-notice-bar) {
  border-radius: 18rpx;
}

.page :deep(.van-cell-group--inset) {
  margin: 0;
  overflow: hidden;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 30rpx rgba(49, 38, 27, 0.06);
}
</style>