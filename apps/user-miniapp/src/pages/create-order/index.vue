<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { createOrder, fetchServices, type ServiceItemDto } from '../../lib/api'

const services = ref<ServiceItemDto[]>([])
const loading = ref(false)
const submitting = ref(false)

const form = reactive({
  serviceCode: 'memorial-cleaning',
  city: '上海市',
  district: '浦东新区',
  contactName: '张家属',
  contactPhone: '13800000001',
  scheduledAt: '2026-05-20T09:00:00.000Z',
  notes: '请带鲜花和基础供品',
})

async function loadServices() {
  loading.value = true

  try {
    const response = await fetchServices()
    services.value = response.items
  }
  finally {
    loading.value = false
  }
}

async function submitOrder() {
  submitting.value = true

  try {
    await createOrder({
      openId: 'user-demo-001',
      phone: form.contactPhone,
      realName: form.contactName,
      serviceCode: form.serviceCode,
      city: form.city,
      district: form.district,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      scheduledAt: form.scheduledAt,
      notes: form.notes,
    })

    uni.showToast({ title: '下单成功', icon: 'success' })
    uni.navigateTo({ url: '/pages/orders/index' })
  }
  finally {
    submitting.value = false
  }
}

onMounted(loadServices)
</script>

<template>
  <view class="page">
    <van-loading v-if="loading" size="24px" vertical>加载服务中</van-loading>

    <template v-else>
      <view class="section">
        <text class="section__title">选择服务</text>
        <van-radio-group :value="form.serviceCode" @change="form.serviceCode = $event.detail">
          <van-cell-group inset>
            <van-cell v-for="item in services" :key="item.code" :title="item.name" :label="item.description" clickable @click="form.serviceCode = item.code">
              <template #right-icon>
                <van-radio :name="item.code" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-radio-group>
      </view>

      <view class="section form-card">
        <text class="section__title">预约信息</text>
        <van-field :value="form.city" label="城市" placeholder="请输入城市" @change="form.city = $event.detail" />
        <van-field :value="form.district" label="区域" placeholder="请输入区域" @change="form.district = $event.detail" />
        <van-field :value="form.contactName" label="联系人" placeholder="请输入联系人" @change="form.contactName = $event.detail" />
        <van-field :value="form.contactPhone" label="手机号" placeholder="请输入手机号" @change="form.contactPhone = $event.detail" />
        <van-field :value="form.scheduledAt" label="预约时间" placeholder="ISO 时间" @change="form.scheduledAt = $event.detail" />
        <van-field :value="form.notes" type="textarea" label="备注" placeholder="填写服务要求" autosize @change="form.notes = $event.detail" />
      </view>

      <van-button type="primary" block :loading="submitting" @click="submitOrder">提交订单</van-button>
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
</style>