<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { acceptOrder, completeWorkerOrder, createFulfillment, fetchPendingOrders, fetchWorkerOrderDetail, fetchWorkerOrders, uploadImage, type WorkerOrderDto } from '../../lib/api'

const workerProfileId = 1
const pendingOrders = ref<WorkerOrderDto[]>([])
const myOrders = ref<WorkerOrderDto[]>([])
const loading = ref(false)
const submitting = ref(false)
const uploadLoading = ref(false)
const activeOrder = ref<WorkerOrderDto | null>(null)

const fulfillmentForm = reactive({
  orderId: 1,
  stageCode: 'arrival',
  description: '已到达现场并完成打卡',
  mediaUrl: '',
  latitude: 0,
  longitude: 0,
})

async function loadData() {
  loading.value = true

  try {
    const [pendingResponse, myResponse] = await Promise.all([
      fetchPendingOrders(),
      fetchWorkerOrders(workerProfileId),
    ])

    pendingOrders.value = pendingResponse.items
    myOrders.value = myResponse.items

    if (myOrders.value[0]) {
      fulfillmentForm.orderId = myOrders.value[0].id
      await openOrder(myOrders.value[0].id)
    }
  }
  finally {
    loading.value = false
  }
}

async function openOrder(orderId: number) {
  const response = await fetchWorkerOrderDetail(orderId)
  activeOrder.value = response.item
}

async function handleAccept(orderId: number) {
  await acceptOrder(orderId, workerProfileId)
  uni.showToast({ title: '接单成功', icon: 'success' })
  await loadData()
}

async function submitFulfillment() {
  submitting.value = true

  try {
    await createFulfillment(fulfillmentForm.orderId, {
      stageCode: fulfillmentForm.stageCode,
      description: fulfillmentForm.description,
      mediaUrl: fulfillmentForm.mediaUrl,
      latitude: fulfillmentForm.latitude,
      longitude: fulfillmentForm.longitude,
    })
    uni.showToast({ title: '履约已提交', icon: 'success' })
    await loadData()
  }
  finally {
    submitting.value = false
  }
}

function punchLocation() {
  uni.getLocation({
    type: 'gcj02',
    success: (result) => {
      fulfillmentForm.latitude = result.latitude
      fulfillmentForm.longitude = result.longitude
      uni.showToast({ title: '定位成功', icon: 'success' })
    },
  })
}

async function confirmComplete() {
  if (!activeOrder.value) {
    return
  }

  await completeWorkerOrder(activeOrder.value.id)
  uni.showToast({ title: '已提交完结', icon: 'success' })
  await loadData()
}

async function handleUploadMedia() {
  uploadLoading.value = true

  try {
    const chooseResult = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })

    fulfillmentForm.mediaUrl = await uploadImage(chooseResult.tempFilePaths[0])
    uni.showToast({ title: '图片已上传', icon: 'success' })
  }
  finally {
    uploadLoading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <view class="page">
    <van-loading v-if="loading" size="24px" vertical>加载任务中</van-loading>

    <template v-else>
      <view class="section">
        <text class="section__title">待接订单</text>
        <van-empty v-if="pendingOrders.length === 0" description="暂无待接订单" />
        <view v-else class="card-list">
          <view v-for="item in pendingOrders" :key="item.id" class="task-card">
            <text class="task-card__title">{{ item.serviceName }}</text>
            <text class="task-card__meta">{{ item.city }} / {{ item.district }} · {{ item.scheduledAt }}</text>
            <text class="task-card__meta">联系人 {{ item.contactName }}</text>
            <van-button size="small" type="primary" @click="handleAccept(item.id)">立即接单</van-button>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section__title">我的履约</text>
        <view class="card-list">
          <view v-for="item in myOrders" :key="item.id" class="task-card">
            <text class="task-card__title">{{ item.serviceName }}</text>
            <text class="task-card__meta">订单号 {{ item.orderNo }}</text>
            <text class="task-card__meta">{{ item.status }} · {{ item.notes || '无备注' }}</text>
            <van-button size="small" plain type="primary" @click="openOrder(item.id)">查看任务详情</van-button>
          </view>
        </view>
      </view>

      <view class="section form-card">
        <text class="section__title">提交履约节点</text>
        <van-field :value="String(fulfillmentForm.orderId)" label="订单 ID" type="number" @change="fulfillmentForm.orderId = Number($event.detail)" />
        <van-field :value="fulfillmentForm.stageCode" label="节点编码" placeholder="arrival / preparation / completion" @change="fulfillmentForm.stageCode = $event.detail" />
        <van-button plain type="primary" block :loading="uploadLoading" @click="handleUploadMedia">上传现场图片</van-button>
        <text class="task-card__meta">{{ fulfillmentForm.mediaUrl || '暂未上传图片' }}</text>
        <van-field :value="fulfillmentForm.description" label="说明" type="textarea" autosize @change="fulfillmentForm.description = $event.detail" />
        <van-button plain block @click="punchLocation">定位打卡</van-button>
        <text class="task-card__meta">当前位置 {{ fulfillmentForm.latitude }} / {{ fulfillmentForm.longitude }}</text>
        <van-button type="primary" block :loading="submitting" @click="submitFulfillment">提交履约</van-button>
      </view>

      <view v-if="activeOrder" class="section form-card">
        <text class="section__title">任务详情</text>
        <text class="task-card__meta">订单号 {{ activeOrder.orderNo }}</text>
        <text class="task-card__meta">状态 {{ activeOrder.status }}</text>
        <view v-for="record in activeOrder.fulfillmentRecords || []" :key="record.id" class="task-card__meta">
          {{ record.stageCode }} · {{ record.description || '无说明' }}
        </view>
        <van-button plain type="success" block @click="confirmComplete">完结确认</van-button>
      </view>
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

.card-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.task-card,
.form-card {
  padding: 28rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 10rpx 26rpx rgba(56, 39, 21, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.task-card__title {
  font-size: 28rpx;
  font-weight: 600;
}

.task-card__meta {
  color: #5d4c40;
  line-height: 1.6;
}
</style>