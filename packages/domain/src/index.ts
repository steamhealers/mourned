export type TradeMode = 'direct' | 'quote' | 'review'
export type DeliveryMode = 'onsite' | 'remote' | 'hybrid'

export interface ServiceItem {
  code: string
  name: string
  tradeMode: TradeMode
  deliveryMode: DeliveryMode
  description: string
}

export interface DashboardMetric {
  label: string
  value: string
}

export interface FulfillmentStage {
  code: string
  name: string
  description: string
}

export const serviceCatalog: ServiceItem[] = [
  {
    code: 'memorial-cleaning',
    name: '代祭扫与墓位清洁',
    tradeMode: 'direct',
    deliveryMode: 'onsite',
    description: '适合异地家庭快速下单，强调照片视频回传和关键节点存证。',
  },
  {
    code: 'errand-support',
    name: '白事跑腿代办',
    tradeMode: 'direct',
    deliveryMode: 'onsite',
    description: '覆盖鲜花贡品代购、白事用品配送、墓园陪同与材料代跑。',
  },
  {
    code: 'funeral-consulting',
    name: '白事咨询与套餐报价',
    tradeMode: 'quote',
    deliveryMode: 'remote',
    description: '先提交需求，再由平台输出可确认的报价单与服务建议。',
  },
  {
    code: 'cemetery-consulting',
    name: '风水选墓咨询',
    tradeMode: 'review',
    deliveryMode: 'hybrid',
    description: '默认进入预约审核链路，强调环境与礼仪咨询，不做结果承诺。',
  },
  {
    code: 'online-memorial',
    name: '线上纪念馆与云祭扫',
    tradeMode: 'direct',
    deliveryMode: 'remote',
    description: '用于拉新与留存，支持祭日提醒、家庭留言与公开范围控制。',
  },
]

export const userQuickActions = [
  {
    title: '快速下单',
    description: '为代祭扫、跑腿代办建立标准化交易入口。',
  },
  {
    title: '询价与咨询',
    description: '对白事协办和非标需求生成待确认报价。',
  },
  {
    title: '查看履约凭证',
    description: '在订单中查看到场、摆放、清洁、祭扫完成等节点记录。',
  },
]

export const workerDashboard: DashboardMetric[] = [
  {
    label: '待接单',
    value: '06',
  },
  {
    label: '今日任务',
    value: '04',
  },
  {
    label: '待上传凭证',
    value: '03',
  },
  {
    label: '本周收入',
    value: '¥2,640',
  },
]

export const fulfillmentStages: FulfillmentStage[] = [
  {
    code: 'arrival',
    name: '到场打卡',
    description: '记录时间、地点和首张现场照片，作为履约起点。',
  },
  {
    code: 'preparation',
    name: '供品摆放',
    description: '上传供品摆放前后照片，并记录特殊备注。',
  },
  {
    code: 'service',
    name: '服务执行',
    description: '记录清扫、祭拜、陪同或跑腿完成的关键节点。',
  },
  {
    code: 'completion',
    name: '完结提交',
    description: '提交整单说明，等待用户确认和后台结算。',
  },
]

export const adminHighlights: DashboardMetric[] = [
  {
    label: '今日新增订单',
    value: '18',
  },
  {
    label: '待审核代办员',
    value: '7',
  },
  {
    label: '待处理售后',
    value: '3',
  },
  {
    label: '纪念馆待审核内容',
    value: '12',
  },
]