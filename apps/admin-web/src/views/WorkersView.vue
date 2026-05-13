<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createWorkerSettlement, fetchWorkers, reviewWorkerStatus, type WorkerDto } from '../lib/api'

const loading = ref(false)
const items = ref<WorkerDto[]>([])
const settlementPeriod = ref('2026-05上半月')

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

onMounted(loadWorkers)

async function updateWorkerStatus(workerProfileId: number, status: WorkerDto['status']) {
  await reviewWorkerStatus(workerProfileId, status)
  ElMessage.success('代办员状态已更新')
  await loadWorkers()
}

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
              <el-button size="small" type="success" plain @click="updateWorkerStatus(item.id, 'active')">通过审核</el-button>
              <el-button size="small" type="warning" plain @click="updateWorkerStatus(item.id, 'pending')">转待审核</el-button>
              <el-button size="small" type="danger" plain @click="updateWorkerStatus(item.id, 'frozen')">冻结</el-button>
              <el-button size="small" type="primary" @click="generateSettlement(item.id)">生成结算</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </section>
</template>