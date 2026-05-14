<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AdminMenuType } from '../lib/access-model'
import { createAdminMenu, deleteAdminMenu, fetchAdminMenus, type AdminMenuDto, updateAdminMenu } from '../lib/api'
import { useAdminAccess } from '../lib/access'

const { hasPermission } = useAdminAccess()

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingMenuId = ref<number | null>(null)
const items = ref<AdminMenuDto[]>([])

const menuForm = reactive({
  parentId: null as number | null,
  menuType: 'menu' as AdminMenuType,
  menuKey: '',
  name: '',
  routePath: '',
  icon: '',
  permissionCode: '',
  sortOrder: 0,
  isEnabled: true,
})

const menuTypeOptions: Array<{ label: string, value: AdminMenuType }> = [
  { label: '目录', value: 'catalog' },
  { label: '菜单', value: 'menu' },
  { label: '按钮', value: 'button' },
]

/**
 * 将树形菜单拍平成带缩进层级的下拉选项。
 *
 * @param {readonly AdminMenuDto[]} nodes 当前层级菜单节点。
 * @param {number} [depth=0] 当前递归深度。
 * @returns {Array<{ label: string, value: number }>} 用于父级菜单选择的选项列表。
 */
function flattenMenus(nodes: readonly AdminMenuDto[], depth = 0): Array<{ label: string, value: number }> {
  return nodes.flatMap((node) => {
    const current = { label: `${'　'.repeat(depth)}${node.name}`, value: node.id }
    return [current, ...flattenMenus(node.children, depth + 1)]
  })
}

const parentOptions = computed(() => flattenMenus(items.value))

/**
 * 将菜单编辑表单恢复到默认状态。
 *
 * @returns {void}
 */
function resetForm() {
  menuForm.parentId = null
  menuForm.menuType = 'menu'
  menuForm.menuKey = ''
  menuForm.name = ''
  menuForm.routePath = ''
  menuForm.icon = ''
  menuForm.permissionCode = ''
  menuForm.sortOrder = 0
  menuForm.isEnabled = true
}

/**
 * 拉取完整菜单树，并维护页面级 loading 状态。
 *
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadMenus() {
  loading.value = true

  try {
    const response = await fetchAdminMenus()
    items.value = response.items
  }
  finally {
    loading.value = false
  }
}

/**
 * 打开新建菜单弹窗，并可选预置父级菜单。
 *
 * @param {number | null} [parentId=null] 预置的父级菜单 id。
 * @returns {void}
 */
function openCreateMenu(parentId: number | null = null) {
  editingMenuId.value = null
  resetForm()
  menuForm.parentId = parentId
  dialogVisible.value = true
}

/**
 * 打开编辑菜单弹窗，并使用目标菜单数据回填表单。
 *
 * @param {AdminMenuDto} item 需要编辑的菜单节点。
 * @returns {void}
 */
function openEditMenu(item: AdminMenuDto) {
  editingMenuId.value = item.id
  menuForm.parentId = item.parentId
  menuForm.menuType = item.menuType
  menuForm.menuKey = item.menuKey
  menuForm.name = item.name
  menuForm.routePath = item.routePath ?? ''
  menuForm.icon = item.icon ?? ''
  menuForm.permissionCode = item.permissionCode ?? ''
  menuForm.sortOrder = item.sortOrder
  menuForm.isEnabled = item.isEnabled
  dialogVisible.value = true
}

/**
 * 提交菜单创建或更新请求，并在成功后刷新菜单树。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitMenu() {
  saving.value = true

  try {
    const payload = {
      parentId: menuForm.parentId,
      menuType: menuForm.menuType,
      menuKey: menuForm.menuKey,
      name: menuForm.name,
      routePath: menuForm.routePath || undefined,
      icon: menuForm.icon || undefined,
      permissionCode: menuForm.permissionCode || undefined,
      sortOrder: menuForm.sortOrder,
      isEnabled: menuForm.isEnabled,
    }

    if (editingMenuId.value) {
      await updateAdminMenu(editingMenuId.value, payload)
      ElMessage.success('菜单已更新')
    }
    else {
      await createAdminMenu(payload)
      ElMessage.success('菜单已创建')
    }

    dialogVisible.value = false
    await loadMenus()
  }
  finally {
    saving.value = false
  }
}

/**
 * 删除指定菜单节点，并在成功后刷新菜单树。
 *
 * @param {AdminMenuDto} item 需要删除的菜单节点。
 * @returns {Promise<void>} 删除完成后的 Promise。
 */
async function removeMenu(item: AdminMenuDto) {
  await ElMessageBox.confirm(`确定删除菜单“${item.name}”吗？其子节点权限会一起删除。`, '删除菜单', {
    type: 'warning',
  })

  await deleteAdminMenu(item.id)
  await loadMenus()
  ElMessage.success('菜单已删除')
}

/**
 * 页面挂载后初始化菜单树数据。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void loadMenus()
})
</script>

<template>
  <section class="page-shell admin-page">
    <el-card shadow="hover" v-loading="loading">
      <template #header>
        <div class="panel-title">
          <span>菜单管理</span>
          <el-button v-if="hasPermission('access.menus.create')" type="primary" @click="openCreateMenu()">新建菜单</el-button>
        </div>
      </template>

      <el-table :data="items" row-key="id" default-expand-all :tree-props="{ children: 'children' }" stripe>
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column prop="menuKey" label="键" min-width="160" />
        <el-table-column prop="menuType" label="类型" width="100" />
        <el-table-column prop="routePath" label="路由" min-width="180" />
        <el-table-column prop="permissionCode" label="权限码" min-width="220" />
        <el-table-column prop="icon" label="图标" width="120" />
        <el-table-column prop="sortOrder" label="排序" width="90" />
        <el-table-column label="启用" width="90">
          <template #default="scope">
            <el-tag :type="scope.row.isEnabled ? 'success' : 'info'" round>
              {{ scope.row.isEnabled ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="scope">
            <el-button v-if="hasPermission('access.menus.create')" link type="primary" @click="openCreateMenu(scope.row.id)">新增子菜单</el-button>
            <el-button v-if="hasPermission('access.menus.edit')" link type="primary" @click="openEditMenu(scope.row)">编辑</el-button>
            <el-button v-if="hasPermission('access.menus.delete')" link type="danger" @click="removeMenu(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingMenuId ? '编辑菜单' : '新建菜单'" width="620px">
      <el-form label-width="96px">
        <el-form-item label="父级菜单">
          <el-select v-model="menuForm.parentId" clearable style="width: 100%">
            <el-option label="顶级菜单" :value="null" />
            <el-option v-for="item in parentOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-segmented v-model="menuForm.menuType" :options="menuTypeOptions" />
        </el-form-item>
        <el-form-item label="菜单键"><el-input v-model="menuForm.menuKey" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="menuForm.name" /></el-form-item>
        <el-form-item label="路由"><el-input v-model="menuForm.routePath" placeholder="按钮可留空" /></el-form-item>
        <el-form-item label="图标"><el-input v-model="menuForm.icon" placeholder="如 DataBoard、Setting" /></el-form-item>
        <el-form-item label="权限码"><el-input v-model="menuForm.permissionCode" placeholder="如 access.menus.edit" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="menuForm.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="menuForm.isEnabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitMenu">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>