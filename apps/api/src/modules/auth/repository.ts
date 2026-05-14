import type { RowDataPacket } from 'mysql2/promise'
import { pool } from '../../lib/db'
import { getAdminSessionProfile } from '../admin-access/repository'
import type { AdminLoginInput, UserLoginInput, WorkerLoginInput } from './types'

interface UserRow extends RowDataPacket {
  id: number
  open_id: string
}

interface WorkerLoginRow extends RowDataPacket {
  id: number
  user_id: number
  open_id: string
}

interface AdminLoginRow extends RowDataPacket {
  id: number
  username: string
  display_name: string
  auth_mode: 'demo' | 'password' | 'wechat-work'
  password_hint: string | null
  status: 'active' | 'inactive'
}

/**
 * 根据 openId 查询用户登录身份，并组装用户端会话数据。
 *
 * @param {UserLoginInput} input 用户端登录输入。
 * @returns {Promise<{ userId: number, openId: string, session: { authMode: 'demo', openId: string } }>} 登录结果。
 */
export async function loginUser(input: UserLoginInput) {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, open_id FROM users WHERE open_id = :openId LIMIT 1',
    { openId: input.openId },
  )

  const user = rows[0]

  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  return {
    userId: user.id,
    openId: user.open_id,
    session: {
      authMode: 'demo' as const,
      openId: user.open_id,
    },
  }
}

/**
 * 根据 workerProfileId 查询代办员登录身份，并组装代办员端会话数据。
 *
 * @param {WorkerLoginInput} input 代办员端登录输入。
 * @returns {Promise<{ workerProfileId: number, openId: string, session: { authMode: 'demo', workerProfileId: number } }>} 登录结果。
 */
export async function loginWorker(input: WorkerLoginInput) {
  const [rows] = await pool.query<WorkerLoginRow[]>(
    `
      SELECT wp.id, wp.user_id, u.open_id
      FROM worker_profiles wp
      INNER JOIN users u ON u.id = wp.user_id
      WHERE wp.id = :workerProfileId
      LIMIT 1
    `,
    { workerProfileId: input.workerProfileId },
  )

  const worker = rows[0]

  if (!worker) {
    throw new Error('WORKER_NOT_FOUND')
  }

  return {
    workerProfileId: worker.id,
    openId: worker.open_id,
    session: {
      authMode: 'demo' as const,
      workerProfileId: worker.id,
    },
  }
}

/**
 * 根据用户名和演示密码提示校验后台用户，并返回后台会话信息。
 *
 * @param {AdminLoginInput} input 后台登录输入。
 * @returns {Promise<{ adminUserId: number, username: string, session: Awaited<ReturnType<typeof getAdminSessionProfile>> }>} 登录结果。
 */
export async function loginAdmin(input: AdminLoginInput) {
  const [rows] = await pool.query<AdminLoginRow[]>(
    `
      SELECT id, username, display_name, auth_mode, password_hint, status
      FROM admin_users
      WHERE username = :username
      LIMIT 1
    `,
    { username: input.username },
  )

  const adminUser = rows[0]

  if (!adminUser || adminUser.status !== 'active') {
    throw new Error('ADMIN_USER_NOT_FOUND')
  }

  if ((adminUser.password_hint ?? '') !== input.password) {
    throw new Error('ADMIN_PASSWORD_INVALID')
  }

  return {
    adminUserId: adminUser.id,
    username: adminUser.username,
    session: await getAdminSessionProfile(adminUser.username),
  }
}