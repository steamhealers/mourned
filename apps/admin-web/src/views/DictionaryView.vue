<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminAccess } from '../lib/access'
import {
  createDictionary,
  createDictionaryItem,
  deleteDictionary,
  deleteDictionaryItem,
  fetchDictionaries,
  type AdminScope,
  type DictionaryDto,
  type DictionaryItemDto,
  type DictionaryStatus,
  updateDictionary,
  updateDictionaryItem,
} from '../lib/api'

const { hasPermission } = useAdminAccess()
const loading = ref(false)
const items = ref<DictionaryDto[]>([])
const selectedDictionaryId = ref<number | null>(null)
const dictionaryDialogVisible = ref(false)
const itemDialogVisible = ref(false)
const savingDictionary = ref(false)
const savingItem = ref(false)
const editingDictionaryId = ref<number | null>(null)
const editingItemId = ref<number | null>(null)
const itemParentLabel = ref('根节点')

const dictionaryForm = reactive({
  code: '',
  name: '',
  scope: 'shared' as AdminScope,
  description: '',
  status: 'active' as DictionaryStatus,
})

const itemForm = reactive({
  parentId: null as number | null,
  itemKey: '',
  label: '',
  value: '',
  sortOrder: 0,
  isEnabled: true,
  extraJsonText: '',
})

const scopeOptions: Array<{ label: string, value: AdminScope }> = [
  { label: '共享', value: 'shared' },
  { label: '用户端', value: 'user-miniapp' },
  { label: '代办员端', value: 'worker-miniapp' },
  { label: '后台管理端', value: 'admin-web' },
  { label: 'API', value: 'api' },
]

const statusOptions: Array<{ label: string, value: DictionaryStatus }> = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
]

const selectedDictionary = computed(() => items.value.find(item => item.id === selectedDictionaryId.value) ?? null)

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
 * 将字典表单恢复到默认状态。
 *
 * @returns {void}
 */
function resetDictionaryForm() {
  dictionaryForm.code = ''
  dictionaryForm.name = ''
  dictionaryForm.scope = 'shared'
  dictionaryForm.description = ''
  dictionaryForm.status = 'active'
}

/**
 * 将字典条目表单恢复到默认状态，并可选预置父节点。
 *
 * @param {number | null} [parentId=null] 预置的父节点 id。
 * @returns {void}
 */
function resetItemForm(parentId: number | null = null) {
  itemForm.parentId = parentId
  itemForm.itemKey = ''
  itemForm.label = ''
  itemForm.value = ''
  itemForm.sortOrder = 0
  itemForm.isEnabled = true
  itemForm.extraJsonText = ''
}

/**
 * 拉取字典列表，并尽量保持当前选中项或切换到指定字典。
 *
 * @param {number | null} [preferredDictionaryId] 期望在刷新后继续选中的字典 id。
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadDictionaries(preferredDictionaryId?: number | null) {
  loading.value = true

  try {
    const response = await fetchDictionaries()
    items.value = response.items

    const nextDictionaryId = preferredDictionaryId ?? selectedDictionaryId.value
    if (nextDictionaryId && items.value.some(item => item.id === nextDictionaryId)) {
      selectedDictionaryId.value = nextDictionaryId
      return
    }

    selectedDictionaryId.value = items.value[0]?.id ?? null
  }
  finally {
    loading.value = false
  }
}

/**
 * 打开新建字典弹窗。
 *
 * @returns {void}
 */
function openCreateDictionary() {
  editingDictionaryId.value = null
  resetDictionaryForm()
  dictionaryDialogVisible.value = true
}

/**
 * 打开编辑字典弹窗，并使用目标字典回填表单。
 *
 * @param {DictionaryDto} dictionary 需要编辑的字典对象。
 * @returns {void}
 */
function openEditDictionary(dictionary: DictionaryDto) {
  editingDictionaryId.value = dictionary.id
  dictionaryForm.code = dictionary.code
  dictionaryForm.name = dictionary.name
  dictionaryForm.scope = dictionary.scope
  dictionaryForm.description = dictionary.description ?? ''
  dictionaryForm.status = dictionary.status
  dictionaryDialogVisible.value = true
}

/**
 * 提交字典创建或更新请求，并在成功后刷新列表与选中项。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitDictionary() {
  savingDictionary.value = true

  try {
    if (editingDictionaryId.value) {
      const response = await updateDictionary(editingDictionaryId.value, {
        ...dictionaryForm,
        description: dictionaryForm.description || undefined,
      })
      await loadDictionaries(response.item?.id ?? editingDictionaryId.value)
      ElMessage.success('字典已更新')
    }
    else {
      const response = await createDictionary({
        ...dictionaryForm,
        description: dictionaryForm.description || undefined,
      })
      await loadDictionaries(response.item?.id ?? null)
      ElMessage.success('字典已创建')
    }

    dictionaryDialogVisible.value = false
  }
  finally {
    savingDictionary.value = false
  }
}

/**
 * 删除指定字典，并在成功后刷新列表。
 *
 * @param {DictionaryDto} dictionary 需要删除的字典对象。
 * @returns {Promise<void>} 删除完成后的 Promise。
 */
async function removeDictionary(dictionary: DictionaryDto) {
  await ElMessageBox.confirm(`确定删除字典“${dictionary.name}”吗？其下所有节点会一起删除。`, '删除字典', {
    type: 'warning',
  })

  await deleteDictionary(dictionary.id)
  await loadDictionaries(selectedDictionaryId.value === dictionary.id ? null : selectedDictionaryId.value)
  ElMessage.success('字典已删除')
}

/**
 * 打开新增根节点弹窗。
 *
 * @returns {void}
 */
function openCreateRootItem() {
  if (!selectedDictionary.value) {
    return
  }

  editingItemId.value = null
  itemParentLabel.value = '根节点'
  resetItemForm(null)
  itemDialogVisible.value = true
}

/**
 * 打开新增子节点弹窗，并预置父节点信息。
 *
 * @param {DictionaryItemDto} item 作为父节点的条目对象。
 * @returns {void}
 */
function openCreateChildItem(item: DictionaryItemDto) {
  editingItemId.value = null
  itemParentLabel.value = item.label
  resetItemForm(item.id)
  itemDialogVisible.value = true
}

/**
 * 打开编辑条目弹窗，并使用目标条目回填表单。
 *
 * @param {DictionaryItemDto} item 需要编辑的条目对象。
 * @returns {void}
 */
function openEditItem(item: DictionaryItemDto) {
  editingItemId.value = item.id
  itemParentLabel.value = item.parentId ? `节点 ${item.parentId}` : '根节点'
  itemForm.parentId = item.parentId
  itemForm.itemKey = item.itemKey
  itemForm.label = item.label
  itemForm.value = item.value
  itemForm.sortOrder = item.sortOrder
  itemForm.isEnabled = item.isEnabled
  itemForm.extraJsonText = item.extraJson ? JSON.stringify(item.extraJson, null, 2) : ''
  itemDialogVisible.value = true
}

/**
 * 解析扩展 JSON 文本；为空时返回 undefined，格式非法时返回 null。
 *
 * @returns {unknown | undefined | null} 解析后的 JSON 值、空值或非法标记。
 */
function parseExtraJsonText() {
  if (!itemForm.extraJsonText.trim()) {
    return undefined
  }

  try {
    return JSON.parse(itemForm.extraJsonText)
  }
  catch {
    ElMessage.error('扩展 JSON 格式不合法')
    return null
  }
}

/**
 * 提交字典条目的创建或更新请求，并在成功后刷新字典详情。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitItem() {
  if (!selectedDictionary.value) {
    return
  }

  const extraJson = parseExtraJsonText()
  if (extraJson === null) {
    return
  }

  savingItem.value = true

  try {
    if (editingItemId.value) {
      const response = await updateDictionaryItem(editingItemId.value, {
        parentId: itemForm.parentId,
        itemKey: itemForm.itemKey,
        label: itemForm.label,
        value: itemForm.value,
        sortOrder: itemForm.sortOrder,
        isEnabled: itemForm.isEnabled,
        extraJson,
      })
      await loadDictionaries(response.item?.id ?? selectedDictionary.value.id)
      ElMessage.success('字典节点已更新')
    }
    else {
      const response = await createDictionaryItem(selectedDictionary.value.id, {
        parentId: itemForm.parentId,
        itemKey: itemForm.itemKey,
        label: itemForm.label,
        value: itemForm.value,
        sortOrder: itemForm.sortOrder,
        isEnabled: itemForm.isEnabled,
        extraJson,
      })
      await loadDictionaries(response.item?.id ?? selectedDictionary.value.id)
      ElMessage.success('字典节点已创建')
    }

    itemDialogVisible.value = false
  }
  finally {
    savingItem.value = false
  }
}

/**
 * 删除指定字典条目，并在成功后刷新当前字典详情。
 *
 * @param {DictionaryItemDto} item 需要删除的条目对象。
 * @returns {Promise<void>} 删除完成后的 Promise。
 */
async function removeItem(item: DictionaryItemDto) {
  if (!selectedDictionary.value) {
    return
  }

  await ElMessageBox.confirm(`确定删除节点“${item.label}”吗？其子节点会一起删除。`, '删除节点', {
    type: 'warning',
  })

  await deleteDictionaryItem(item.id)
  await loadDictionaries(selectedDictionary.value.id)
  ElMessage.success('字典节点已删除')
}

/**
 * 页面挂载后初始化字典列表与默认选中项。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void loadDictionaries()
})
</script>

<template>
  <section class="page-shell admin-page">
    <el-row :gutter="16" class="dictionary-layout">
      <el-col :xs="24" :xl="10">
        <el-card shadow="hover" v-loading="loading">
          <template #header>
            <div class="panel-title">
              <span>字典管理</span>
              <el-button v-if="hasPermission('dictionaries.create')" type="primary" @click="openCreateDictionary">新建字典</el-button>
            </div>
          </template>

          <el-table :data="items" highlight-current-row @current-change="selectedDictionaryId = $event?.id ?? selectedDictionaryId" @row-click="selectedDictionaryId = $event.id">
            <el-table-column prop="name" label="字典名称" min-width="180" />
            <el-table-column prop="code" label="编码" min-width="160" />
            <el-table-column label="端范围" width="120">
              <template #default="scope">
                {{ getScopeLabel(scope.row.scope) }}
              </template>
            </el-table-column>
            <el-table-column prop="itemCount" label="节点数" width="80" />
            <el-table-column label="状态" width="90">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'" round>
                  {{ scope.row.status === 'active' ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="scope">
                <el-button v-if="hasPermission('dictionaries.edit')" link type="primary" @click.stop="openEditDictionary(scope.row)">编辑</el-button>
                <el-button v-if="hasPermission('dictionaries.delete')" link type="danger" @click.stop="removeDictionary(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :xl="14">
        <el-card shadow="hover" class="dictionary-tree-card" v-loading="loading">
          <template #header>
            <div class="panel-title">
              <span>{{ selectedDictionary?.name ?? '字典节点' }}</span>
              <el-button v-if="hasPermission('dictionaries.item.create')" type="primary" plain :disabled="!selectedDictionary" @click="openCreateRootItem">新增根节点</el-button>
            </div>
          </template>

          <template v-if="selectedDictionary">
            <p class="dictionary-tree-card__desc">
              {{ selectedDictionary.description || '暂无说明' }}
            </p>

            <el-table
              :data="selectedDictionary.items"
              row-key="id"
              default-expand-all
              :tree-props="{ children: 'children' }"
            >
              <el-table-column prop="label" label="节点名称" min-width="180" />
              <el-table-column prop="itemKey" label="键" min-width="140" />
              <el-table-column prop="value" label="值" min-width="140" />
              <el-table-column prop="sortOrder" label="排序" width="80" />
              <el-table-column label="启用" width="90">
                <template #default="scope">
                  <el-tag :type="scope.row.isEnabled ? 'success' : 'info'" round>
                    {{ scope.row.isEnabled ? '是' : '否' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="180" fixed="right">
                <template #default="scope">
                  <el-button v-if="hasPermission('dictionaries.item.create')" link type="primary" @click="openCreateChildItem(scope.row)">新增子项</el-button>
                  <el-button v-if="hasPermission('dictionaries.item.edit')" link type="primary" @click="openEditItem(scope.row)">编辑</el-button>
                  <el-button v-if="hasPermission('dictionaries.item.delete')" link type="danger" @click="removeItem(scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>

          <el-empty v-else description="请先创建或选择一个字典" />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="dictionaryDialogVisible" :title="editingDictionaryId ? '编辑字典' : '新建字典'" width="520px">
      <el-form label-width="96px">
        <el-form-item label="字典编码"><el-input v-model="dictionaryForm.code" /></el-form-item>
        <el-form-item label="字典名称"><el-input v-model="dictionaryForm.name" /></el-form-item>
        <el-form-item label="端范围">
          <el-select v-model="dictionaryForm.scope" style="width: 100%">
            <el-option v-for="item in scopeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-segmented v-model="dictionaryForm.status" :options="statusOptions" />
        </el-form-item>
        <el-form-item label="说明"><el-input v-model="dictionaryForm.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dictionaryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingDictionary" @click="submitDictionary">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="itemDialogVisible" :title="editingItemId ? '编辑节点' : '新建节点'" width="560px">
      <el-form label-width="96px">
        <el-form-item label="父节点"><el-text>{{ itemParentLabel }}</el-text></el-form-item>
        <el-form-item label="节点键"><el-input v-model="itemForm.itemKey" /></el-form-item>
        <el-form-item label="节点名称"><el-input v-model="itemForm.label" /></el-form-item>
        <el-form-item label="节点值"><el-input v-model="itemForm.value" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="itemForm.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="是否启用"><el-switch v-model="itemForm.isEnabled" /></el-form-item>
        <el-form-item label="扩展 JSON">
          <el-input v-model="itemForm.extraJsonText" type="textarea" :rows="5" placeholder="可选，填写 JSON 对象或数组" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingItem" @click="submitItem">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>
