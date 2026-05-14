import { z } from 'zod'

export const adminScopeSchema = z.enum(['shared', 'user-miniapp', 'worker-miniapp', 'admin-web', 'api'])
export const dictionaryStatusSchema = z.enum(['active', 'inactive'])
export const settingValueTypeSchema = z.enum(['string', 'number', 'boolean', 'json'])

export const createDictionarySchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  scope: adminScopeSchema.default('shared'),
  description: z.string().max(255).optional(),
  status: dictionaryStatusSchema.default('active'),
})

export const createDictionaryItemSchema = z.object({
  parentId: z.number().int().positive().nullable().optional(),
  itemKey: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
  value: z.string().min(1).max(255),
  sortOrder: z.number().int().nonnegative().default(0),
  isEnabled: z.boolean().default(true),
  extraJson: z.unknown().optional(),
})

export const listSystemSettingsQuerySchema = z.object({
  scope: adminScopeSchema.optional(),
  groupCode: z.string().min(1).max(64).optional(),
})

export const listPublicSystemSettingsQuerySchema = z.object({
  scope: adminScopeSchema.optional(),
  groupCode: z.string().min(1).max(64).optional(),
})

export const getPublicDictionaryQuerySchema = z.object({
  scope: adminScopeSchema.optional(),
})

export const createSystemSettingSchema = z.object({
  scope: adminScopeSchema.default('shared'),
  groupCode: z.string().min(1).max(64),
  settingKey: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  valueType: settingValueTypeSchema.default('string'),
  valueText: z.string().min(1),
  description: z.string().max(255).optional(),
  isPublic: z.boolean().default(false),
})

export type AdminScope = z.infer<typeof adminScopeSchema>
export type DictionaryStatus = z.infer<typeof dictionaryStatusSchema>
export type SettingValueType = z.infer<typeof settingValueTypeSchema>
export type CreateDictionaryInput = z.infer<typeof createDictionarySchema>
export type CreateDictionaryItemInput = z.infer<typeof createDictionaryItemSchema>
export type ListSystemSettingsQuery = z.infer<typeof listSystemSettingsQuerySchema>
export type ListPublicSystemSettingsQuery = z.infer<typeof listPublicSystemSettingsQuerySchema>
export type GetPublicDictionaryQuery = z.infer<typeof getPublicDictionaryQuerySchema>
export type CreateSystemSettingInput = z.infer<typeof createSystemSettingSchema>
