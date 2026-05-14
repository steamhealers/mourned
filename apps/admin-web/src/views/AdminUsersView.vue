<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AdminAuthMode, AdminEntityStatus } from '../lib/access-model'
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminRoles,
  fetchAdminUsers,
  type AdminRoleDto,
  type AdminUserDto,
  updateAdminUser,
} from '../lib/api'
import { useAdminAccess } from '../lib/access'

const { hasPermission } = useAdminAccess()

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingUserId = ref<number | null>(null)
const users = ref<AdminUserDto[]>([])
const roles = ref<AdminRoleDto[]>([])

const userForm = reactive({
  username: '',
  displayName: '',
  authMode: 'demo' as AdminAuthMode,
  passwordHint: '',
  status: 'active' as AdminEntityStatus,
  roleIds: [] as number[],
})

const authModeOptions: Array<{ label: string, value: AdminAuthMode }> = [
  { label: '演示', value: 'demo' },
  { label: '账号密码', value: 'password' },
  { label: '企业微信', value: 'wechat-work' },
]

const statusOptions: Array<{ label: string, value: AdminEntityStatus }> = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
]

const activeRoleOptions = computed(() => roles.value.filter(role => role.status === 'active'))

/**
 * 将后台用户表单恢复到默认状态。
 *
 * @returns {void}
 */
function resetForm() {
  userForm.username = ''
  userForm.displayName = ''
  userForm.authMode = 'demo'
  userForm.passwordHint = ''
  userForm.status = 'active'
  userForm.roleIds = []
}

/**
 * 并行加载后台用户列表与角色列表。
 *
 * @returns {Promise<void>} 数据加载完成后的 Promise。
 */
async function loadData() {
  loading.value = true

  try {
    const [userResponse, roleResponse] = await Promise.all([
      fetchAdminUsers(),
      fetchAdminRoles(),
    ])

    users.value = userResponse.items
    roles.value = roleResponse.items
  }
  finally {
    loading.value = false
  }
}

/**
 * 打开新建后台用户弹窗。
 *
 * @returns {void}
 */
function openCreateUser() {
  editingUserId.value = null
  resetForm()
  dialogVisible.value = true
}

/**
 * 打开编辑后台用户弹窗，并使用目标用户回填表单。
 *
 * @param {AdminUserDto} user 需要编辑的后台用户。
 * @returns {void}
 */
function openEditUser(user: AdminUserDto) {
  editingUserId.value = user.id
  userForm.username = user.username
  userForm.displayName = user.displayName
  userForm.authMode = user.authMode
  userForm.passwordHint = user.passwordHint ?? ''
  userForm.status = user.status
  userForm.roleIds = [...user.roleIds]
  dialogVisible.value = true
}

/**
 * 提交后台用户创建或更新请求，并在成功后刷新页面数据。
 *
 * @returns {Promise<void>} 提交完成后的 Promise。
 */
async function submitUser() {
  saving.value = true

  try {
    const payload = {
      ...userForm,
      passwordHint: userForm.passwordHint || undefined,
    }

    if (editingUserId.value) {
      await updateAdminUser(editingUserId.value, payload)
      ElMessage.success('用户已更新')
    }
    else {
      await createAdminUser(payload)
      ElMessage.success('用户已创建')
    }

    dialogVisible.value = false
    await loadData()
  }
  finally {
    saving.value = false
  }
}

/**
 * 删除指定后台用户，并在成功后刷新页面数据。
 *
 * @param {AdminUserDto} user 需要删除的后台用户。
 * @returns {Promise<void>} 删除完成后的 Promise。
 */
async function removeUser(user: AdminUserDto) {
  await ElMessageBox.confirm(`确定删除用户“${user.displayName}”吗？`, '删除用户', {
    type: 'warning',
  })

  await deleteAdminUser(user.id)
  await loadData()
  ElMessage.success('用户已删除')
}

/**
 * 页面挂载后初始化后台用户与角色数据。
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
          <span>后台用户管理</span>
          <el-button v-if="hasPermission('access.users.create')" type="primary" @click="openCreateUser">新建用户</el-button>
        </div>
      </template>

      <el-table :data="users" stripe>
        <el-table-column prop="displayName" label="姓名" min-width="160" />
        <el-table-column prop="username" label="账号" min-width="160" />
        <el-table-column prop="authMode" label="登录方式" width="120" />
        <el-table-column label="角色" min-width="220">
          <template #default="scope">
            <div class="tag-group">
              <el-tag v-for="role in scope.row.roles" :key="role.id" size="small" round effect="plain">{{ role.name }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'" round>
              {{ scope.row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="passwordHint" label="密码提示" min-width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button v-if="hasPermission('access.users.edit')" link type="primary" @click="openEditUser(scope.row)">编辑</el-button>
            <el-button v-if="hasPermission('access.users.delete')" link type="danger" @click="removeUser(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingUserId ? '编辑用户' : '新建用户'" width="620px">
      <el-form label-width="96px">
        <el-form-item label="账号"><el-input v-model="userForm.username" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="userForm.displayName" /></el-form-item>
        <el-form-item label="登录方式"><el-segmented v-model="userForm.authMode" :options="authModeOptions" /></el-form-item>
        <el-form-item label="密码提示"><el-input v-model="userForm.passwordHint" placeholder="演示阶段仅保留提示，不存真实密码" /></el-form-item>
        <el-form-item label="状态"><el-segmented v-model="userForm.status" :options="statusOptions" /></el-form-item>
        <el-form-item label="关联角色">
          <el-select v-model="userForm.roleIds" multiple style="width: 100%">
            <el-option v-for="role in activeRoleOptions" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitUser">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>