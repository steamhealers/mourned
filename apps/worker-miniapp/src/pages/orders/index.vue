<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { fulfillmentStages as fallbackFulfillmentStages, getOrderStatusLabel, type OrderStatus } from '@mourned/domain'
import { acceptOrder, createFulfillment, fetchPendingOrders, fetchPublicDictionary, fetchWorkerOrderDetail, fetchWorkerOrders, uploadImage, type PublicDictionaryItemDto, type WorkerOrderDto } from '../../lib/api'
import { getCurrentWorkerSession } from '../../lib/session'

interface FulfillmentStageOption {
  code: string
  name: string
  description: string
}

const workerProfileId = getCurrentWorkerSession().workerProfileId
const pendingOrders = ref<WorkerOrderDto[]>([])
const myOrders = ref<WorkerOrderDto[]>([])
const loading = ref(false)
const pageError = ref('')
const actionLoading = ref(false)
const uploadLoading = ref(false)
const activeOrder = ref<WorkerOrderDto | null>(null)
const fulfillmentStages = ref<FulfillmentStageOption[]>(
  fallbackFulfillmentStages.map(stage => ({
    code: stage.code,
    name: stage.name,
    description: stage.description,
  })),
)

const fulfillmentForm = reactive({
  stageCode: 'arrival',
  description: '已到达现场并完成打卡',
  mediaUrl: '',
  latitude: 0,
  longitude: 0,
})

// 当前任务已有的履约记录，供表单和时间线复用。
const activeRecords = computed(() => activeOrder.value?.fulfillmentRecords ?? [])

// 将已提交节点收敛成集合，便于过滤后续可选阶段。
const completedStageCodes = computed(() => new Set(activeRecords.value.map(record => record.stageCode)))

// 当前任务只开放未提交的节点；已提交完结后不再允许重复补提。
const availableStages = computed(() => fulfillmentStages.value.filter((stage) => {
  if (activeOrder.value?.status === 'pending_confirm' || activeOrder.value?.status === 'completed') {
    return false
  }

  return !completedStageCodes.value.has(stage.code)
}))

// 当前选中的履约节点信息，用于展示节点名称和默认说明。
const selectedStage = computed(() => availableStages.value.find(stage => stage.code === fulfillmentForm.stageCode) ?? availableStages.value[0] ?? null)

// 只有服务中的任务才允许继续提交新的履约节点。
const canSubmitFulfillment = computed(() => activeOrder.value?.status === 'in_service' && Boolean(selectedStage.value))

// 根据节点类型动态调整按钮文案，避免把“完结申请”误叫成普通打卡。
const submitButtonText = computed(() => selectedStage.value?.code === 'completion' ? '提交完结申请' : '提交履约节点')

// 为待确认或已完成任务输出清晰的状态提示。
const completionHint = computed(() => {
  if (activeOrder.value?.status === 'pending_confirm') {
    return '完结申请已提交，等待家属确认。'
  }

  if (activeOrder.value?.status === 'completed') {
    return '该订单已完成，后续仅保留履约记录查看。'
  }

  return ''
})

/**
 * 将公开字典条目转换为代办员页使用的履约阶段选项。
 *
 * @param {PublicDictionaryItemDto} item 字典条目。
 * @returns {FulfillmentStageOption} 页面展示所需的节点配置。
 */
function mapStageOption(item: PublicDictionaryItemDto): FulfillmentStageOption {
  const extra = item.extraJson as { description?: string } | null

  return {
    code: item.value,
    name: item.label,
    description: extra?.description ?? '',
  }
}

/**
 * 将接口错误转换为适合代办员端展示的提示。
 *
 * @param {unknown} error 接口错误对象。
 * @param {string} fallback 默认兜底文案。
 * @returns {string} 用户可读的错误提示。
 */
function resolveErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback
  }

  if (error.message.includes('403')) {
    return '当前任务暂不允许此操作'
  }

  if (error.message.includes('404')) {
    return '任务不存在或已被移除'
  }

  if (error.message.includes('409')) {
    return '任务状态已变化，请刷新后重试'
  }

  if (error.message.includes('UPLOAD_FAILED')) {
    return '现场图片上传失败'
  }

  return fallback
}

/**
 * 将履约表单重置到当前任务的可用默认值。
 *
 * @returns {void}
 */
function syncFulfillmentForm() {
  const nextStage = availableStages.value[0] ?? fulfillmentStages.value[0] ?? null

  fulfillmentForm.stageCode = nextStage?.code ?? 'arrival'
  fulfillmentForm.description = nextStage?.description ?? '已到达现场并完成打卡'
  fulfillmentForm.mediaUrl = ''
  fulfillmentForm.latitude = 0
  fulfillmentForm.longitude = 0
}

/**
 * 拉取履约阶段字典；如果配置不可用，则继续使用共享默认值。
 *
 * @returns {Promise<void>} 字典加载完成后的 Promise。
 */
async function loadFulfillmentStages() {
  try {
    const response = await fetchPublicDictionary('fulfillment-stage', { scope: 'worker-miniapp' })
    const items = response.item.items.map(mapStageOption)

    if (items.length > 0) {
      fulfillmentStages.value = items
    }
  }
  catch {
    fulfillmentStages.value = fallbackFulfillmentStages.map(stage => ({
      code: stage.code,
      name: stage.name,
      description: stage.description,
    }))
  }
}

/**
 * 获取订单状态的展示文案。
 *
 * @param {OrderStatus} status 订单状态。
 * @returns {string} 中文状态文案。
 */
function getStatusTagText(status: OrderStatus) {
  return getOrderStatusLabel(status)
}

/**
 * 判断当前订单状态是否允许提交完结。
 *
 * @param {OrderStatus} status 订单状态。
 * @returns {boolean} 为 true 表示允许完结。
 */
function canCompleteOrder(status: OrderStatus) {
  return status === 'in_service' || status === 'pending_confirm'
}

/**
 * 拉取待接订单、我的订单和默认详情数据。
 *
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadData() {
  loading.value = true
  pageError.value = ''

  try {
    const [pendingResponse, myResponse] = await Promise.all([
      fetchPendingOrders(),
      fetchWorkerOrders(workerProfileId),
    ])

    pendingOrders.value = pendingResponse.items
    myOrders.value = myResponse.items

    const nextActiveOrderId = activeOrder.value?.id
      ?? myOrders.value[0]?.id
      ?? pendingOrders.value[0]?.id

    if (nextActiveOrderId) {
      await openOrder(nextActiveOrderId)
    }
    else {
      activeOrder.value = null
      syncFulfillmentForm()
    }
  }
  catch (error) {
    pageError.value = resolveErrorMessage(error, '任务加载失败，请稍后重试')
  }
  finally {
    loading.value = false
  }
}

/**
 * 打开指定订单详情。
 *
 * @param {number} orderId 订单 id。
 * @returns {Promise<void>} 详情加载完成后的 Promise。
 */
async function openOrder(orderId: number) {
  const response = await fetchWorkerOrderDetail(orderId)
  activeOrder.value = response.item
  syncFulfillmentForm()
}

/**
 * 提交接单操作，并在成功后刷新页面数据。
 *
 * @param {number} orderId 订单 id。
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function handleAccept(orderId: number) {
  actionLoading.value = true

  try {
    await acceptOrder(orderId, workerProfileId)
    uni.showToast({ title: '接单成功', icon: 'success' })
    await loadData()
  }
  catch (error) {
    uni.showToast({ title: resolveErrorMessage(error, '接单失败'), icon: 'none' })
  }
  finally {
    actionLoading.value = false
  }
}

/**
 * 提交履约节点。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitFulfillment() {
  if (!activeOrder.value || !canSubmitFulfillment.value) {
    return
  }

  actionLoading.value = true

  try {
    await createFulfillment(activeOrder.value.id, {
      stageCode: fulfillmentForm.stageCode,
      description: fulfillmentForm.description,
      mediaUrl: fulfillmentForm.mediaUrl,
      latitude: fulfillmentForm.latitude,
      longitude: fulfillmentForm.longitude,
    })
    uni.showToast({ title: fulfillmentForm.stageCode === 'completion' ? '完结申请已提交' : '履约已提交', icon: 'success' })
    await loadData()
  }
  catch (error) {
    uni.showToast({ title: resolveErrorMessage(error, '履约提交失败'), icon: 'none' })
  }
  finally {
    actionLoading.value = false
  }
}

/**
 * 获取当前位置并写入履约表单。
 *
 * @returns {void}
 */
function punchLocation() {
  uni.getLocation({
    type: 'gcj02',
    /**
     * 处理定位成功回调，并将经纬度写回履约表单。
     *
     * @param {UniApp.GetLocationSuccess} result 定位成功结果。
     * @returns {void} 无返回值。
     */
    success: (result) => {
      fulfillmentForm.latitude = result.latitude
      fulfillmentForm.longitude = result.longitude
      uni.showToast({ title: '定位成功', icon: 'success' })
    },
    fail: () => {
      uni.showToast({ title: '定位失败，请检查定位权限', icon: 'none' })
    },
  })
}

/**
 * 根据下拉选择切换履约节点，并同步默认说明。
 *
 * @param {{ detail: { value: number | string } }} event picker 选中事件。
 * @returns {void}
 */
function handleStageChange(event: { detail: { value: number | string } }) {
  const nextStage = availableStages.value[Number(event.detail.value)]

  if (!nextStage) {
    return
  }

  fulfillmentForm.stageCode = nextStage.code
  fulfillmentForm.description = nextStage.description
}

/**
 * 选择并上传现场图片。
 *
 * @returns {Promise<void>} 上传完成后的 Promise。
 */
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
  catch (error) {
    uni.showToast({ title: resolveErrorMessage(error, '图片上传失败'), icon: 'none' })
  }
  finally {
    uploadLoading.value = false
  }
}

/**
 * 页面挂载后初始化待接订单、我的任务与默认详情。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void loadFulfillmentStages()
  void loadData()
})
</script>

<template>
  <view class="page">
    <van-loading v-if="loading" size="24px" vertical>加载任务中</van-loading>

    <view v-else-if="pageError" class="section form-card">
      <text class="section__title">任务加载失败</text>
      <text class="task-card__meta">{{ pageError }}</text>
      <van-button type="primary" block @click="loadData">重新加载</van-button>
    </view>

    <template v-else>
      <view class="section">
        <text class="section__title">待接订单</text>
        <van-empty v-if="pendingOrders.length === 0" description="暂无待接订单" />
        <view v-else class="card-list">
          <view v-for="item in pendingOrders" :key="item.id" class="task-card">
            <text class="task-card__title">{{ item.serviceName }}</text>
            <text class="task-card__meta">{{ item.city }} / {{ item.district }} · {{ item.scheduledAt }}</text>
            <text class="task-card__meta">联系人 {{ item.contactName }}</text>
            <view class="task-card__actions">
              <van-button size="small" plain type="primary" @click="openOrder(item.id)">查看详情</van-button>
              <van-button size="small" type="primary" :loading="actionLoading" @click="handleAccept(item.id)">立即接单</van-button>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section__title">我的履约</text>
        <van-empty v-if="myOrders.length === 0" description="暂无进行中的任务" />
        <view v-else class="card-list">
          <view v-for="item in myOrders" :key="item.id" class="task-card">
            <text class="task-card__title">{{ item.serviceName }}</text>
            <text class="task-card__meta">订单号 {{ item.orderNo }}</text>
            <text class="task-card__meta">{{ getStatusTagText(item.status) }} · {{ item.notes || '无备注' }}</text>
            <van-button size="small" plain type="primary" @click="openOrder(item.id)">查看任务详情</van-button>
          </view>
        </view>
      </view>

      <view v-if="activeOrder" class="section form-card">
        <text class="section__title">任务详情</text>
        <text class="task-card__meta">订单号 {{ activeOrder.orderNo }}</text>
        <text class="task-card__meta">服务 {{ activeOrder.serviceName }}</text>
        <text class="task-card__meta">联系人 {{ activeOrder.contactName }}</text>
        <text class="task-card__meta">预约时间 {{ activeOrder.scheduledAt }}</text>
        <text class="task-card__meta">状态 {{ getStatusTagText(activeOrder.status) }}</text>
        <text v-if="completionHint" class="task-card__meta task-card__meta--highlight">{{ completionHint }}</text>

        <view class="section section--compact">
          <text class="section__subtitle">履约记录</text>
          <van-empty v-if="activeRecords.length === 0" description="尚未提交履约节点" />
          <view v-for="record in activeRecords" :key="record.id" class="task-card__meta">
            {{ record.stageCode }} · {{ record.description || '无说明' }}
          </view>
        </view>

        <view class="section section--compact">
          <text class="section__subtitle">提交履约节点</text>
          <picker :range="availableStages" range-key="name" @change="handleStageChange">
            <view class="picker-field">
              <text class="picker-field__label">当前节点</text>
              <text class="picker-field__value">{{ selectedStage?.name ?? '暂无可选节点' }}</text>
            </view>
          </picker>
          <text class="task-card__meta">{{ selectedStage?.description || '当前任务暂无可提交的履约节点。' }}</text>
          <van-button plain type="primary" block :loading="uploadLoading" @click="handleUploadMedia">上传现场图片</van-button>
          <text class="task-card__meta">{{ fulfillmentForm.mediaUrl || '暂未上传图片' }}</text>
          <van-field :value="fulfillmentForm.description" label="说明" type="textarea" autosize @change="fulfillmentForm.description = $event.detail" />
          <van-button plain block @click="punchLocation">定位打卡</van-button>
          <text class="task-card__meta">当前位置 {{ fulfillmentForm.latitude }} / {{ fulfillmentForm.longitude }}</text>
          <van-button type="primary" block :disabled="!canSubmitFulfillment" :loading="actionLoading" @click="submitFulfillment">{{ submitButtonText }}</van-button>
        </view>

        <view class="section section--compact">
          <text class="section__subtitle">任务备注</text>
          <text class="task-card__meta">{{ activeOrder.notes || '暂无备注' }}</text>
        </view>
      </view>

      <view v-else class="section form-card">
        <text class="section__title">任务详情</text>
        <text class="task-card__meta">当前没有可查看的任务，请先接单或刷新列表。</text>
        <van-button plain type="primary" block @click="loadData">刷新任务列表</van-button>
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

.section--compact {
  gap: 14rpx;
}

.section__title {
  font-size: 30rpx;
  font-weight: 600;
}

.section__subtitle {
  font-size: 26rpx;
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

.task-card__meta--highlight {
  color: #996515;
}

.task-card__actions {
  display: flex;
  gap: 16rpx;
}

.picker-field {
  padding: 24rpx;
  border-radius: 20rpx;
  background: #f7f1ea;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.picker-field__label {
  font-size: 22rpx;
  color: #7f6a59;
}

.picker-field__value {
  font-size: 28rpx;
  font-weight: 600;
  color: #2f241d;
}
</style>