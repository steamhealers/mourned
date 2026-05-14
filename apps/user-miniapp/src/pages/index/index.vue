<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchPublicSystemSettings, fetchServices, type PublicSystemSettingDto, type ServiceItemDto } from '../../lib/api'

interface QuickActionItem {
  title: string
  description: string
}

const services = ref<ServiceItemDto[]>([])
const quickActions = ref<QuickActionItem[]>([])
const noticeText = ref('当前演示接入 Vant Weapp，首期默认开放代祭扫、跑腿代办与咨询报价。')

/**
 * 将系统参数数组转换成按 settingKey 索引的 Map。
 *
 * @param {PublicSystemSettingDto[]} settings 系统参数列表。
 * @returns {Map<string, string>} 以参数键为索引的值映射。
 */
function createSettingMap(settings: PublicSystemSettingDto[]) {
  return new Map(settings.map(setting => [setting.settingKey, setting.valueText]))
}

/**
 * 拉取首页服务目录与公开配置。
 *
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadPageData() {
  const [serviceResponse, settingResponse] = await Promise.all([
    fetchServices(),
    fetchPublicSystemSettings({ scope: 'user-miniapp', groupCode: 'homepage' }),
  ])

  services.value = serviceResponse.items

  const settingMap = createSettingMap(settingResponse.items)
  noticeText.value = settingMap.get('notice_text') ?? noticeText.value

  const quickActionsJson = settingMap.get('quick_actions')
  if (quickActionsJson) {
    quickActions.value = JSON.parse(quickActionsJson) as QuickActionItem[]
  }
}

/**
 * 页面挂载后初始化首页服务目录与公开配置。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void loadPageData()
})

/**
 * 跳转到下单页。
 *
 * @returns {void}
 */
function goToCreateOrder() {
  uni.navigateTo({
    url: '/pages/create-order/index',
  })
}

/**
 * 跳转到订单列表页。
 *
 * @returns {void}
 */
function goToOrders() {
  uni.navigateTo({
    url: '/pages/orders/index',
  })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="hero__eyebrow">Mourned</text>
      <text class="hero__title">异地祭扫与白事协办</text>
      <text class="hero__desc">先交付代祭扫、跑腿代办和咨询报价，所有进度可追踪，关键节点有履约凭证。</text>
    </view>

    <van-notice-bar left-icon="volume-o" :text="noticeText" />

    <view class="section">
      <text class="section__title">服务入口</text>
      <van-cell-group inset>
        <van-cell v-for="item in services" :key="item.code" :title="item.name" :label="item.description" is-link>
          <template #value>
            <van-tag plain type="primary">{{ item.tradeMode }}</van-tag>
          </template>
        </van-cell>
      </van-cell-group>
    </view>

    <view class="section">
      <text class="section__title">当前阶段能力</text>
      <van-cell-group inset>
        <van-cell v-for="item in quickActions" :key="item.title" :title="item.title" :label="item.description" />
      </van-cell-group>
    </view>

    <view class="section">
      <text class="section__title">快速操作</text>
      <view class="action-row">
        <van-button type="primary" block @click="goToCreateOrder">立即下单</van-button>
        <van-button plain block @click="goToOrders">查看我的订单</van-button>
      </view>
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

.action-row {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
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