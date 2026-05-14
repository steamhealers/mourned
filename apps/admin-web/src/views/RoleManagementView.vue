<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ElTree } from 'element-plus'
import type { AdminEntityStatus } from '../lib/access-model'
import {
  createAdminRole,
  deleteAdminRole,
  fetchAdminMenus,
  fetchAdminRoles,
  type AdminMenuDto,
  type AdminRoleDto,
  updateAdminRole,
} from '../lib/api'
import { useAdminAccess } from '../lib/access'

const { hasPermission } = useAdminAccess()

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingRoleId = ref<number | null>(null)
const roles = ref<AdminRoleDto[]>([])
const menus = ref<AdminMenuDto[]>([])
const permissionTreeRef = ref<InstanceType<typeof ElTree> | null>(null)

const roleForm = reactive({
  code: '',
  name: '',
  description: '',
  status: 'active' as AdminEntityStatus,
})

const statusOptions: Array<{ label: string, value: AdminEntityStatus }> = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
]

/**
 * 将角色编辑表单恢复到默认状态，供新建角色时复用。
 *
 * @returns {void}
 */
function resetForm() {
  roleForm.code = ''
  roleForm.name = ''
  roleForm.description = ''
  roleForm.status = 'active'
}

/**
 * 并行加载角色列表与权限菜单树，作为页面展示和弹窗编辑的数据源。
 *
 * @returns {Promise<void>} 加载完成后的 Promise。
 */
async function loadData() {
  loading.value = true

  try {
    const [roleResponse, menuResponse] = await Promise.all([
      fetchAdminRoles(),
      fetchAdminMenus(),
    ])

    roles.value = roleResponse.items
    menus.value = menuResponse.items
  }
  finally {
    loading.value = false
  }
}

/**
 * 打开新建角色弹窗，并清空上一次编辑留下的表单与权限勾选状态。
 *
 * @returns {void}
 */
function openCreateRole() {
  editingRoleId.value = null
  resetForm()
  dialogVisible.value = true
  nextTick(() => {
    permissionTreeRef.value?.setCheckedKeys([])
  })
}

/**
 * 打开编辑角色弹窗，并使用目标角色的字段和值回填表单。
 *
 * @param {AdminRoleDto} role 要编辑的角色对象。
 * @returns {void}
 */
function openEditRole(role: AdminRoleDto) {
  editingRoleId.value = role.id
  roleForm.code = role.code
  roleForm.name = role.name
  roleForm.description = role.description ?? ''
  roleForm.status = role.status
  dialogVisible.value = true
  nextTick(() => {
    permissionTreeRef.value?.setCheckedKeys(role.permissionIds, false)
  })
}

/**
 * 汇总权限树中的全选与半选节点，生成提交给后端的权限 id 列表。
 *
 * @returns {number[]} 去重后的权限 id 数组。
 */
function getSelectedPermissionIds() {
  const checkedKeys = permissionTreeRef.value?.getCheckedKeys(false) ?? []
  const halfCheckedKeys = permissionTreeRef.value?.getHalfCheckedKeys() ?? []
  return Array.from(new Set([...checkedKeys, ...halfCheckedKeys].map(item => Number(item))))
}

/**
 * 提交角色创建或更新请求，并在成功后刷新当前页面数据。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitRole() {
  saving.value = true

  try {
    const payload = {
      ...roleForm,
      description: roleForm.description || undefined,
      permissionIds: getSelectedPermissionIds(),
    }

    if (editingRoleId.value) {
      await updateAdminRole(editingRoleId.value, payload)
      ElMessage.success('角色已更新')
    }
    else {
      await createAdminRole(payload)
      ElMessage.success('角色已创建')
    }

    dialogVisible.value = false
    await loadData()
  }
  finally {
    saving.value = false
  }
}

/**
 * 删除指定角色，并在确认后重新拉取列表保证页面状态同步。
 *
 * @param {AdminRoleDto} role 需要删除的角色对象。
 * @returns {Promise<void>} 删除完成后的 Promise。
 */
async function removeRole(role: AdminRoleDto) {
  await ElMessageBox.confirm(`确定删除角色“${role.name}”吗？`, '删除角色', {
    type: 'warning',
  })

  await deleteAdminRole(role.id)
  await loadData()
  ElMessage.success('角色已删除')
}

/**
 * 页面挂载后初始化角色列表与权限树。
 *
 * @returns {void} 无返回值。
 */
onMounted(() => {
  void loadData()
})
</script>

<template>
  <section class="page-shell admin-page">
    <el-card shadow="hover" v-loading="loading">
      <template #header>
        <div class="panel-title">
          <span>角色权限管理</span>
          <el-button v-if="hasPermission('access.roles.create')" type="primary" @click="openCreateRole">新建角色</el-button>
        </div>
      </template>

      <el-table :data="roles" stripe>
        <el-table-column prop="name" label="角色名称" min-width="160" />
        <el-table-column prop="code" label="编码" min-width="140" />
        <el-table-column prop="description" label="说明" min-width="220" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'" round>
              {{ scope.row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限预览" min-width="320">
          <template #default="scope">
            <div class="tag-group">
              <el-tag v-for="code in scope.row.permissionCodes.slice(0, 6)" :key="code" size="small" round effect="plain">{{ code }}</el-tag>
              <el-tag v-if="scope.row.permissionCodes.length > 6" size="small" type="info" round>+{{ scope.row.permissionCodes.length - 6 }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="userCount" label="用户数" width="90" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button v-if="hasPermission('access.roles.edit')" link type="primary" @click="openEditRole(scope.row)">编辑</el-button>
            <el-button v-if="hasPermission('access.roles.delete')" link type="danger" @click="removeRole(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingRoleId ? '编辑角色' : '新建角色'" width="760px">
      <el-form label-width="96px">
        <el-form-item label="角色编码"><el-input v-model="roleForm.code" /></el-form-item>
        <el-form-item label="角色名称"><el-input v-model="roleForm.name" /></el-form-item>
        <el-form-item label="状态"><el-segmented v-model="roleForm.status" :options="statusOptions" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="roleForm.description" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="权限树">
          <el-tree
            ref="permissionTreeRef"
            class="permission-tree"
            :data="menus"
            node-key="id"
            show-checkbox
            default-expand-all
            :props="{ label: 'name', children: 'children' }"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitRole">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>