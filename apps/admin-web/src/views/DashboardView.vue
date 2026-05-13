<script setup lang="ts">
import { Calendar, DataAnalysis, Files, UserFilled } from '@element-plus/icons-vue'
import { adminHighlights, serviceCatalog } from '@mourned/domain'

const focusTracks = [
  '订单调度与客服仲裁',
  '代办员审核与分区管理',
  '纪念馆内容审核',
  '财务结算与退款处理',
]
</script>

<template>
  <div class="page-shell">
    <el-row :gutter="20" class="hero-row">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never" class="hero-card">
          <template #header>
            <div class="hero-card__header">
              <div>
                <p class="eyebrow">Mourned Admin</p>
                <h1>白事服务后台控制台</h1>
              </div>
              <el-tag type="warning" effect="dark" round>Element Plus</el-tag>
            </div>
          </template>
          <p class="hero-copy">先覆盖订单调度、代办员审核、内容审核和财务结算四条主线。</p>
          <div class="hero-actions">
            <el-button type="primary">查看订单中心</el-button>
            <el-button plain>审核纪念馆内容</el-button>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="focus-card">
          <template #header>
            <div class="panel-title">
              <span>首期重点</span>
              <el-icon><DataAnalysis /></el-icon>
            </div>
          </template>
          <el-timeline>
            <el-timeline-item v-for="item in focusTracks" :key="item" type="primary" hollow>
              {{ item }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col v-for="(item, index) in adminHighlights" :key="item.label" :xs="24" :sm="12" :xl="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-card__body">
            <el-icon class="metric-card__icon" :size="22">
              <Calendar v-if="index === 0" />
              <UserFilled v-else-if="index === 1" />
              <Files v-else-if="index === 2" />
              <DataAnalysis v-else />
            </el-icon>
            <div>
              <strong>{{ item.value }}</strong>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :xs="24" :xl="16">
        <el-card shadow="hover">
          <template #header>
            <div class="panel-title">
              <span>服务目录</span>
              <el-tag round>交易模型基线</el-tag>
            </div>
          </template>
          <el-table :data="serviceCatalog" stripe>
            <el-table-column prop="name" label="服务名称" min-width="180" />
            <el-table-column prop="deliveryMode" label="履约方式" width="120" />
            <el-table-column prop="tradeMode" label="交易模式" width="120" />
            <el-table-column prop="description" label="说明" min-width="260" />
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :xl="8">
        <el-card shadow="hover" class="side-panel">
          <template #header>
            <div class="panel-title">
              <span>实施提醒</span>
              <el-tag type="info" round>首期范围</el-tag>
            </div>
          </template>
          <el-alert
            title="先做标准化闭环"
            type="success"
            :closable="false"
            show-icon
            description="围绕代祭扫、跑腿代办和咨询报价形成下单、派单、履约、售后闭环。"
          />
          <el-alert
            title="敏感服务后置"
            type="warning"
            :closable="false"
            show-icon
            description="风水选墓和纪念馆内容默认走人工审核，避免直接自动成交。"
          />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>