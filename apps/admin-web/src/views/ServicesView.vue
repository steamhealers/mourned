<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchServices, type ServiceItemDto } from '../lib/api'

const loading = ref(false)
const items = ref<ServiceItemDto[]>([])

async function loadServices() {
  loading.value = true

  try {
    const response = await fetchServices()
    items.value = response.items
  }
  finally {
    loading.value = false
  }
}

onMounted(loadServices)
</script>

<template>
  <section class="page-shell admin-page">
    <el-card shadow="hover">
      <template #header>
        <div class="panel-title">
          <span>服务管理</span>
          <el-tag round>MySQL 实时数据</el-tag>
        </div>
      </template>

      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column prop="name" label="服务名称" min-width="180" />
        <el-table-column prop="code" label="服务编码" width="180" />
        <el-table-column prop="tradeMode" label="交易模式" width="120" />
        <el-table-column prop="deliveryMode" label="履约方式" width="120" />
        <el-table-column prop="description" label="说明" min-width="260" />
      </el-table>
    </el-card>
  </section>
</template>