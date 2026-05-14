import { z } from 'zod'

export const adminMenuTypeSchema = z.enum(['catalog', 'menu', 'button'])
export const adminEntityStatusSchema = z.enum(['active', 'inactive'])
export const adminAuthModeSchema = z.enum(['demo', 'password', 'wechat-work'])

export const createAdminMenuSchema = z.object({
  parentId: z.number().int().positive().nullable().optional(),
  menuType: adminMenuTypeSchema.default('menu'),
  menuKey: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  routePath: z.string().min(1).max(255).optional(),
  icon: z.string().min(1).max(64).optional(),
  permissionCode: z.string().min(1).max(128).optional(),
  sortOrder: z.number().int().nonnegative().default(0),
  isEnabled: z.boolean().default(true),
})

export const createAdminRoleSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  description: z.string().max(255).optional(),
  status: adminEntityStatusSchema.default('active'),
  permissionIds: z.array(z.number().int().positive()).default([]),
})

export const createAdminUserSchema = z.object({
  username: z.string().min(1).max(64),
  displayName: z.string().min(1).max(128),
  authMode: adminAuthModeSchema.default('demo'),
  passwordHint: z.string().max(255).optional(),
  status: adminEntityStatusSchema.default('active'),
  roleIds: z.array(z.number().int().positive()).default([]),
})

export type AdminMenuType = z.infer<typeof adminMenuTypeSchema>
export type AdminEntityStatus = z.infer<typeof adminEntityStatusSchema>
export type AdminAuthMode = z.infer<typeof adminAuthModeSchema>
export type CreateAdminMenuInput = z.infer<typeof createAdminMenuSchema>
export type CreateAdminRoleInput = z.infer<typeof createAdminRoleSchema>
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>