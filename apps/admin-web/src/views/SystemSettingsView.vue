<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminAccess } from '../lib/access'
import {
  createSystemSetting,
  deleteSystemSetting,
  fetchSystemSettings,
  type AdminScope,
  type SettingValueType,
  type SystemSettingDto,
  updateSystemSetting,
} from '../lib/api'

const { hasPermission } = useAdminAccess()
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingSettingId = ref<number | null>(null)
const items = ref<SystemSettingDto[]>([])

const filters = reactive({
  scope: 'all' as 'all' | AdminScope,
  groupCode: '',
})

const settingForm = reactive({
  scope: 'shared' as AdminScope,
  groupCode: '',
  settingKey: '',
  name: '',
  valueType: 'string' as SettingValueType,
  valueText: '',
  description: '',
  isPublic: false,
})

const scopeOptions: Array<{ label: string, value: AdminScope }> = [
  { label: '共享', value: 'shared' },
  { label: '用户端', value: 'user-miniapp' },
  { label: '代办员端', value: 'worker-miniapp' },
  { label: '后台管理端', value: 'admin-web' },
  { label: 'API', value: 'api' },
]

const valueTypeOptions: Array<{ label: string, value: SettingValueType }> = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: 'JSON', value: 'json' },
]

const filteredItems = computed(() => {
  return items.value.filter((item) => {
    const matchesScope = filters.scope === 'all' || item.scope === filters.scope
    const matchesGroupCode = !filters.groupCode || item.groupCode.includes(filters.groupCode.trim())

    return matchesScope && matchesGroupCode
  })
})

/**
 * 根据端范围值返回对应的中文标签。
 *
 * @param {AdminScope} scope 端范围值。
 * @returns {string} 对应的展示文案。
 */
function getScopeLabel(scope: AdminScope) {
  return scopeOptions.find(item => item.value === scope)?.label ?? scope
}

/**
 * 根据参数值类型返回对应的中文标签。
 *
 * @param {SettingValueType} valueType 参数值类型。
 * @returns {string} 对应的展示文案。
 */
function getValueTypeLabel(valueType: SettingValueType) {
  return valueTypeOptions.find(item => item.value === valueType)?.label ?? valueType
}

/**
 * 将系统参数表单恢复到默认状态。
 *
 * @returns {void}
 */
function resetSettingForm() {
  settingForm.scope = 'shared'
  settingForm.groupCode = ''
  settingForm.settingKey = ''
  settingForm.name = ''
  settingForm.valueType = 'string'
  settingForm.valueText = ''
  settingForm.description = ''
  settingForm.isPublic = false
}

/**
 * 拉取系统参数列表，并维护页面级 loading 状态。
 *
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadSettings() {
  loading.value = true

  try {
    const response = await fetchSystemSettings()
    items.value = response.items
  }
  finally {
    loading.value = false
  }
}

/**
 * 打开新建系统参数弹窗。
 *
 * @returns {void}
 */
function openCreateSetting() {
  editingSettingId.value = null
  resetSettingForm()
  dialogVisible.value = true
}

/**
 * 打开编辑系统参数弹窗，并使用目标参数回填表单。
 *
 * @param {SystemSettingDto} setting 需要编辑的系统参数。
 * @returns {void}
 */
function openEditSetting(setting: SystemSettingDto) {
  editingSettingId.value = setting.id
  settingForm.scope = setting.scope
  settingForm.groupCode = setting.groupCode
  settingForm.settingKey = setting.settingKey
  settingForm.name = setting.name
  settingForm.valueType = setting.valueType
  settingForm.valueText = setting.valueText
  settingForm.description = setting.description ?? ''
  settingForm.isPublic = setting.isPublic
  dialogVisible.value = true
}

/**
 * 校验当前参数值文本是否符合所选值类型的约束。
 *
 * @returns {boolean} 为 true 表示当前值合法。
 */
function validateValueText() {
  if (settingForm.valueType === 'number' && Number.isNaN(Number(settingForm.valueText))) {
    ElMessage.error('数字类型的值必须可转换为数字')
    return false
  }

  if (settingForm.valueType === 'boolean' && !['true', 'false'].includes(settingForm.valueText.trim())) {
    ElMessage.error('布尔类型的值只允许 true 或 false')
    return false
  }

  if (settingForm.valueType === 'json') {
    try {
      JSON.parse(settingForm.valueText)
    }
    catch {
      ElMessage.error('JSON 类型的值必须是合法 JSON')
      return false
    }
  }

  return true
}

/**
 * 提交系统参数创建或更新请求，并在成功后刷新列表。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitSetting() {
  if (!validateValueText()) {
    return
  }

  saving.value = true

  try {
    if (editingSettingId.value) {
      await updateSystemSetting(editingSettingId.value, {
        ...settingForm,
        description: settingForm.description || undefined,
      })
      ElMessage.success('系统参数已更新')
    }
    else {
      await createSystemSetting({
        ...settingForm,
        description: settingForm.description || undefined,
      })
      ElMessage.success('系统参数已创建')
    }

    dialogVisible.value = false
    await loadSettings()
  }
  finally {
    saving.value = false
  }
}

/**
 * 删除指定系统参数，并在成功后刷新列表。
 *
 * @param {SystemSettingDto} setting 需要删除的系统参数。
 * @returns {Promise<void>} 删除完成后的 Promise。
 */
async function removeSetting(setting: SystemSettingDto) {
  await ElMessageBox.confirm(`确定删除参数“${setting.name}”吗？`, '删除系统参数', {
    type: 'warning',
  })

  await deleteSystemSetting(setting.id)
  await loadSettings()
  ElMessage.success('系统参数已删除')
}

/**
 * 页面挂载后初始化系统参数列表。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void loadSettings()
})
</script>

<template>
  <section class="page-shell admin-page">
    <el-card shadow="hover" v-loading="loading">
      <template #header>
        <div class="panel-title">
          <span>参数设置</span>
          <el-button v-if="hasPermission('settings.create')" type="primary" @click="openCreateSetting">新建参数</el-button>
        </div>
      </template>

      <div class="setting-toolbar">
        <el-select v-model="filters.scope" style="width: 180px">
          <el-option label="全部端" value="all" />
          <el-option v-for="item in scopeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-input v-model="filters.groupCode" style="max-width: 240px" placeholder="按参数分组过滤" clearable />
      </div>

      <el-table :data="filteredItems" stripe>
        <el-table-column label="端范围" width="130">
          <template #default="scope">
            {{ getScopeLabel(scope.row.scope) }}
          </template>
        </el-table-column>
        <el-table-column prop="groupCode" label="分组" width="160" />
        <el-table-column prop="settingKey" label="参数键" width="180" />
        <el-table-column prop="name" label="参数名称" min-width="180" />
        <el-table-column label="值类型" width="110">
          <template #default="scope">
            {{ getValueTypeLabel(scope.row.valueType) }}
          </template>
        </el-table-column>
        <el-table-column prop="valueText" label="当前值" min-width="220" show-overflow-tooltip />
        <el-table-column label="公开" width="90">
          <template #default="scope">
            <el-tag :type="scope.row.isPublic ? 'success' : 'info'" round>
              {{ scope.row.isPublic ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" min-width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button v-if="hasPermission('settings.edit')" link type="primary" @click="openEditSetting(scope.row)">编辑</el-button>
            <el-button v-if="hasPermission('settings.delete')" link type="danger" @click="removeSetting(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingSettingId ? '编辑系统参数' : '新建系统参数'" width="560px">
      <el-form label-width="96px">
        <el-form-item label="端范围">
          <el-select v-model="settingForm.scope" style="width: 100%">
            <el-option v-for="item in scopeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="参数分组"><el-input v-model="settingForm.groupCode" /></el-form-item>
        <el-form-item label="参数键"><el-input v-model="settingForm.settingKey" /></el-form-item>
        <el-form-item label="参数名称"><el-input v-model="settingForm.name" /></el-form-item>
        <el-form-item label="值类型">
          <el-segmented v-model="settingForm.valueType" :options="valueTypeOptions" />
        </el-form-item>
        <el-form-item label="参数值">
          <el-input v-model="settingForm.valueText" type="textarea" :rows="4" placeholder="数字直接填写数值，布尔填写 true/false，JSON 填写合法 JSON" />
        </el-form-item>
        <el-form-item label="公开参数"><el-switch v-model="settingForm.isPublic" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="settingForm.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitSetting">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>
