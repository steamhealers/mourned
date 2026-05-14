<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { createOrder, fetchServices, type ServiceItemDto } from '../../lib/api'
import { getCurrentUserSession } from '../../lib/session'

const services = ref<ServiceItemDto[]>([])
const loading = ref(false)
const submitting = ref(false)
const formError = ref('')
const pageError = ref('')

const form = reactive({
  serviceCode: 'memorial-cleaning',
  city: '上海市',
  district: '浦东新区',
  contactName: '张家属',
  contactPhone: '13800000001',
  scheduledDate: '2026-05-20',
  scheduledTime: '09:00',
  notes: '请带鲜花和基础供品',
})

// 当前选中的服务对象，供页面展示交易模式、履约方式和说明摘要。
const selectedService = computed(() => services.value.find(item => item.code === form.serviceCode) ?? null)

// 将日期与时间字段合成为可直接展示给用户的预约预览文本。
const schedulePreview = computed(() => `${form.scheduledDate} ${form.scheduledTime}`)

// 将服务交易模式转换成更易读的中文标签。
const serviceModeLabel = computed(() => {
  if (!selectedService.value) {
    return ''
  }

  switch (selectedService.value.tradeMode) {
    case 'direct':
      return '直接成交'
    case 'quote':
      return '报价确认'
    default:
      return '人工审核'
  }
})

// 将履约方式转换成更易读的中文标签。
const deliveryModeLabel = computed(() => {
  if (!selectedService.value) {
    return ''
  }

  switch (selectedService.value.deliveryMode) {
    case 'onsite':
      return '到场履约'
    case 'remote':
      return '远程处理'
    default:
      return '线上线下结合'
  }
})

// 只在必填字段都存在时允许用户点击提交按钮。
const canSubmit = computed(() => {
  return Boolean(
    form.serviceCode
    && form.city.trim()
    && form.district.trim()
    && form.contactName.trim()
    && form.contactPhone.trim()
    && form.scheduledDate
    && form.scheduledTime,
  )
})

/**
 * 将页面表单数据转换为后端下单接口所需的载荷。
 *
 * @returns {{ phone: string, realName: string, serviceCode: string, city: string, district: string, contactName: string, contactPhone: string, scheduledAt: string, notes?: string }} 标准化后的下单数据。
 */
function buildOrderPayload() {
  return {
    phone: form.contactPhone.trim(),
    realName: form.contactName.trim(),
    serviceCode: form.serviceCode,
    city: form.city.trim(),
    district: form.district.trim(),
    contactName: form.contactName.trim(),
    contactPhone: form.contactPhone.trim(),
    scheduledAt: new Date(`${form.scheduledDate}T${form.scheduledTime}:00`).toISOString(),
    notes: form.notes.trim() || undefined,
  }
}

/**
 * 校验当前表单输入是否合法；失败时写入错误文案并给出即时提示。
 *
 * @returns {boolean} 为 true 表示允许提交。
 */
function validateForm() {
  formError.value = ''

  if (!canSubmit.value) {
    formError.value = '请先补全服务、联系人和预约时间'
  }
  else if (!/^1\d{10}$/.test(form.contactPhone.trim())) {
    formError.value = '请输入正确的 11 位手机号'
  }
  else if (new Date(`${form.scheduledDate}T${form.scheduledTime}:00`).getTime() <= Date.now()) {
    formError.value = '预约时间需要晚于当前时间'
  }

  if (formError.value) {
    uni.showToast({ title: formError.value, icon: 'none' })
    return false
  }

  return true
}

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

  if (error.message.includes('400')) {
    return '提交信息不完整或格式不正确'
  }

  if (error.message.includes('401')) {
    return '登录状态已失效，请重新进入页面'
  }

  if (error.message.includes('500')) {
    return '服务暂时不可用，请稍后重试'
  }

  return fallback
}

/**
 * 当用户切换服务时，根据服务类型补充默认备注提示。
 *
 * @param {string} serviceCode 当前选中的服务编码。
 * @returns {void} 无返回值。
 */
function applyServiceDefaults(serviceCode: string) {
  form.serviceCode = serviceCode

  if (serviceCode === 'memorial-cleaning' && !form.notes.trim()) {
    form.notes = '请带鲜花和基础供品'
  }
}

/**
 * 拉取可选服务列表，并维护页面级 loading 状态。
 *
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadServices() {
  loading.value = true
  pageError.value = ''

  try {
    const response = await fetchServices()
    services.value = response.items

    if (!services.value.some(item => item.code === form.serviceCode)) {
      form.serviceCode = services.value[0]?.code ?? ''
    }
  }
  catch (error) {
    pageError.value = resolveErrorMessage(error, '服务目录加载失败，请稍后重试')
  }
  finally {
    loading.value = false
  }
}

/**
 * 提交下单请求，并在成功后跳转到订单列表页。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitOrder() {
  if (!validateForm()) {
    return
  }

  submitting.value = true

  try {
    const session = getCurrentUserSession()
    const payload = buildOrderPayload()

    await createOrder({
      openId: session.openId,
      ...payload,
    })

    uni.showToast({ title: '下单成功', icon: 'success' })
    uni.navigateTo({ url: '/pages/orders/index' })
  }
  catch (error) {
    const message = resolveErrorMessage(error, '下单失败，请稍后重试')
    formError.value = message
    uni.showToast({ title: message, icon: 'none' })
  }
  finally {
    submitting.value = false
  }
}

/**
 * 页面挂载后初始化下单页的服务目录。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void loadServices()
})
</script>

<template>
  <view class="page">
    <van-loading v-if="loading" size="24px" vertical>加载服务中</van-loading>

    <view v-else-if="pageError" class="section form-card">
      <text class="section__title">服务暂不可用</text>
      <text class="form-error">{{ pageError }}</text>
      <van-button type="primary" block @click="loadServices">重新加载</van-button>
    </view>

    <template v-else>
      <view class="section">
        <text class="section__title">选择服务</text>
        <van-radio-group :value="form.serviceCode" @change="applyServiceDefaults($event.detail)">
          <van-cell-group inset>
            <van-cell v-for="item in services" :key="item.code" :title="item.name" :label="item.description" clickable @click="applyServiceDefaults(item.code)">
              <template #right-icon>
                <van-radio :name="item.code" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-radio-group>
        <view v-if="selectedService" class="service-summary">
          <text class="service-summary__title">已选服务</text>
          <text class="service-summary__meta">{{ selectedService.name }} / {{ serviceModeLabel }} / {{ deliveryModeLabel }}</text>
          <text class="service-summary__meta">{{ selectedService.description }}</text>
        </view>
      </view>

      <view class="section form-card">
        <text class="section__title">预约信息</text>
        <van-field :value="form.city" label="城市" placeholder="请输入城市" @change="form.city = $event.detail" />
        <van-field :value="form.district" label="区域" placeholder="请输入区域" @change="form.district = $event.detail" />
        <van-field :value="form.contactName" label="联系人" placeholder="请输入联系人" @change="form.contactName = $event.detail" />
        <van-field :value="form.contactPhone" label="手机号" type="number" maxlength="11" placeholder="请输入手机号" @change="form.contactPhone = $event.detail" />
        <picker mode="date" :value="form.scheduledDate" @change="form.scheduledDate = $event.detail.value">
          <van-field :value="form.scheduledDate" label="预约日期" placeholder="请选择预约日期" readonly is-link />
        </picker>
        <picker mode="time" :value="form.scheduledTime" @change="form.scheduledTime = $event.detail.value">
          <van-field :value="form.scheduledTime" label="预约时间" placeholder="请选择预约时间" readonly is-link />
        </picker>
        <van-field :value="schedulePreview" label="预约预览" readonly />
        <van-field :value="form.notes" type="textarea" label="备注" placeholder="填写服务要求" autosize @change="form.notes = $event.detail" />
        <text v-if="formError" class="form-error">{{ formError }}</text>
      </view>

      <van-button type="primary" block :loading="submitting" :disabled="!canSubmit" @click="submitOrder">提交订单</van-button>
    </template>
  </view>
</template>

<style scoped>
.page {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.section__title {
  font-size: 30rpx;
  font-weight: 600;
}

.form-card {
  padding: 20rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 30rpx rgba(49, 38, 27, 0.06);
}

.service-summary {
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  background: rgba(196, 164, 132, 0.12);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.service-summary__title {
  font-size: 26rpx;
  font-weight: 600;
  color: #5c4030;
}

.service-summary__meta {
  font-size: 24rpx;
  color: #7b6556;
}

.form-error {
  font-size: 24rpx;
  color: #c44536;
}
</style>