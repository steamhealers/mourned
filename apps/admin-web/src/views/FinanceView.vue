<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchFinanceOverview, type FinanceOverviewDto } from '../lib/api'

const loading = ref(false)
const finance = ref<FinanceOverviewDto | null>(null)

async function loadFinanceOverview() {
  loading.value = true

  try {
    finance.value = await fetchFinanceOverview()
  }
  finally {
    loading.value = false
  }
}

onMounted(loadFinanceOverview)
</script>

<template>
  <section class="page-shell admin-page finance-page" v-loading="loading">
    <el-row :gutter="16">
      <el-col :xs="24" :md="12" :xl="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-card__body">
            <div>
              <strong>{{ finance?.metrics.paidCount ?? 0 }}</strong>
              <span>已入账支付笔数</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12" :xl="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-card__body">
            <div>
              <strong>{{ finance?.metrics.paidAmountTotal ?? 0 }}</strong>
              <span>累计入账金额</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12" :xl="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-card__body">
            <div>
              <strong>{{ finance?.metrics.pendingRefundCount ?? 0 }}</strong>
              <span>待处理退款</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12" :xl="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-card__body">
            <div>
              <strong>{{ finance?.metrics.pendingSettlementCount ?? 0 }}</strong>
              <span>待发放结算单</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :xl="12">
        <el-card shadow="hover">
          <template #header>
            <div class="panel-title">
              <span>支付流水</span>
              <el-tag round type="success">支付回调</el-tag>
            </div>
          </template>

          <el-table :data="finance?.paymentRecords ?? []" stripe>
            <el-table-column prop="orderNo" label="订单号" min-width="140" />
            <el-table-column prop="transactionNo" label="流水号" min-width="160" />
            <el-table-column prop="channel" label="渠道" width="140" />
            <el-table-column prop="amount" label="金额" width="100" />
            <el-table-column prop="status" label="状态" width="110" />
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :xl="12">
        <el-card shadow="hover">
          <template #header>
            <div class="panel-title">
              <span>退款流水</span>
              <el-tag round type="warning">售后追踪</el-tag>
            </div>
          </template>

          <el-table :data="finance?.refundRecords ?? []" stripe>
            <el-table-column prop="orderNo" label="订单号" min-width="140" />
            <el-table-column prop="reason" label="原因" min-width="180" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="110" />
            <el-table-column prop="reviewNote" label="审核说明" min-width="180" show-overflow-tooltip />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="panel-title">
              <span>代办员结算单</span>
              <el-tag round type="info">分账</el-tag>
            </div>
          </template>

          <el-table :data="finance?.settlements ?? []" stripe>
            <el-table-column prop="workerName" label="代办员" width="120" />
            <el-table-column prop="periodLabel" label="结算周期" min-width="160" />
            <el-table-column prop="grossAmount" label="应结总额" width="120" />
            <el-table-column prop="commissionRate" label="佣金率" width="100" />
            <el-table-column prop="netAmount" label="实发金额" width="120" />
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column prop="note" label="备注" min-width="180" show-overflow-tooltip />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </section>
</template>