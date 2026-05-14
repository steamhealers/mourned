<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAdminAccess } from '../lib/access'
import { createWorker, createWorkerSettlement, fetchWorkers, reviewWorkerStatus, type WorkerDto } from '../lib/api'

const { hasPermission } = useAdminAccess()
const loading = ref(false)
const items = ref<WorkerDto[]>([])
const settlementPeriod = ref('2026-05上半月')
const createDialogVisible = ref(false)
const createSubmitting = ref(false)
const createForm = reactive({
  openId: '',
  phone: '',
  realName: '',
  serviceArea: '',
  serviceTagsText: '',
})

/**
 * 将新建代办员表单转换为接口所需的标准载荷，并统一裁剪输入文本。
 *
 * @returns {{ openId: string, phone: string, realName: string, serviceArea: string, serviceTags: string[] }} 标准化后的提交数据。
 */
function buildCreateWorkerPayload() {
  return {
    openId: createForm.openId.trim(),
    phone: createForm.phone.trim(),
    realName: createForm.realName.trim(),
    serviceArea: createForm.serviceArea.trim(),
    serviceTags: createForm.serviceTagsText
      .split(/[,，\n]/)
      .map(tag => tag.trim())
      .filter(Boolean),
  }
}

/**
 * 拉取代办员列表，并维护页面级 loading 状态。
 *
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadWorkers() {
  loading.value = true

  try {
    const response = await fetchWorkers()
    items.value = response.items
  }
  finally {
    loading.value = false
  }
}

/**
 * 页面挂载后初始化代办员列表。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void loadWorkers()
})

/**
 * 重置新建代办员表单。
 *
 * @returns {void} 无返回值。
 */
function resetCreateForm() {
  createForm.openId = ''
  createForm.phone = ''
  createForm.realName = ''
  createForm.serviceArea = ''
  createForm.serviceTagsText = ''
}

/**
 * 打开新建代办员弹窗并初始化表单。
 *
 * @returns {void} 无返回值。
 */
function openCreateDialog() {
  resetCreateForm()
  createDialogVisible.value = true
}

/**
 * 提交新建代办员请求，成功后刷新列表。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitCreateWorker() {
  const payload = buildCreateWorkerPayload()

  if (!payload.openId || !payload.phone || !payload.realName || !payload.serviceArea) {
    ElMessage.warning('请先补全代办员基础信息')
    return
  }

  if (payload.phone.length < 6) {
    ElMessage.warning('手机号长度至少为 6 位')
    return
  }

  createSubmitting.value = true

  try {
    await createWorker(payload)

    ElMessage.success('代办员已创建')
    createDialogVisible.value = false
    await loadWorkers()
  }
  catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '代办员创建失败')
  }
  finally {
    createSubmitting.value = false
  }
}

/**
 * 更新指定代办员的审核状态，并在成功后刷新列表。
 *
 * @param {number} workerProfileId 代办员档案 id。
 * @param {WorkerDto['status']} status 目标状态。
 * @returns {Promise<void>} 更新完成后的 Promise。
 */
async function updateWorkerStatus(workerProfileId: number, status: WorkerDto['status']) {
  await reviewWorkerStatus(workerProfileId, status)
  ElMessage.success('代办员状态已更新')
  await loadWorkers()
}

/**
 * 为指定代办员生成结算单。
 *
 * @param {number} workerProfileId 代办员档案 id。
 * @returns {Promise<void>} 生成完成后的 Promise。
 */
async function generateSettlement(workerProfileId: number) {
  await createWorkerSettlement(workerProfileId, {
    periodLabel: settlementPeriod.value,
    commissionRate: 12,
    note: '后台批量结算',
  })
  ElMessage.success('结算单已生成')
}
</script>

<template>
  <section class="page-shell admin-page">
    <el-card shadow="hover">
      <template #header>
        <div class="panel-title">
          <span>代办员管理</span>
          <el-tag round type="success">接单与履约</el-tag>
        </div>
      </template>

      <div class="worker-toolbar">
        <el-button v-if="hasPermission('workers.create')" type="primary" plain @click="openCreateDialog">新建代办员</el-button>
        <el-input v-model="settlementPeriod" style="max-width: 220px" placeholder="结算期，例如 2026-05上半月" />
      </div>

      <el-row :gutter="16" class="worker-grid">
        <el-col v-for="item in items" :key="item.id" :xs="24" :md="12" :xl="8">
          <el-card shadow="never" class="worker-card" v-loading="loading">
            <div class="worker-card__header">
              <div>
                <strong>{{ item.realName }}</strong>
                <p>{{ item.phone ?? '未绑定手机号' }}</p>
              </div>
              <el-tag :type="item.status === 'active' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'" round>
                {{ item.status }}
              </el-tag>
            </div>

            <p class="worker-card__area">{{ item.serviceArea }}</p>
            <div class="worker-card__tags">
              <el-tag v-for="tag in item.serviceTags" :key="tag" round effect="plain">{{ tag }}</el-tag>
            </div>

            <div class="worker-card__meta">
              <span>评分 {{ item.rating.toFixed(1) }}</span>
              <span>完单 {{ item.completedOrderCount }}</span>
            </div>

            <div class="worker-card__actions">
              <el-button v-if="hasPermission('workers.approve')" size="small" type="success" plain @click="updateWorkerStatus(item.id, 'active')">通过审核</el-button>
              <el-button v-if="hasPermission('workers.pending')" size="small" type="warning" plain @click="updateWorkerStatus(item.id, 'pending')">转待审核</el-button>
              <el-button v-if="hasPermission('workers.freeze')" size="small" type="danger" plain @click="updateWorkerStatus(item.id, 'frozen')">冻结</el-button>
              <el-button v-if="hasPermission('workers.settlement')" size="small" type="primary" @click="generateSettlement(item.id)">生成结算</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-dialog v-model="createDialogVisible" title="新建代办员" width="520px">
      <el-form label-width="92px">
        <el-form-item label="OpenID">
          <el-input v-model="createForm.openId" placeholder="请输入代办员 openId" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="createForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="createForm.realName" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="服务区域">
          <el-input v-model="createForm.serviceArea" placeholder="例如 杭州-西湖区" />
        </el-form-item>
        <el-form-item label="服务标签">
          <el-input
            v-model="createForm.serviceTagsText"
            type="textarea"
            :rows="3"
            placeholder="多个标签可用逗号、中文逗号或换行分隔"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreateWorker">创建</el-button>
      </template>
    </el-dialog>
  </section>
</template>