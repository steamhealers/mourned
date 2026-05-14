import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { pool } from '../../lib/db'
import type {
  AdminScope,
  CreateDictionaryInput,
  CreateDictionaryItemInput,
  CreateSystemSettingInput,
  DictionaryStatus,
  GetPublicDictionaryQuery,
  ListPublicSystemSettingsQuery,
  ListSystemSettingsQuery,
  SettingValueType,
} from './types'

interface DictionaryRow extends RowDataPacket {
  id: number
  code: string
  name: string
  scope: AdminScope
  description: string | null
  status: DictionaryStatus
  created_at: string
  updated_at: string
}

interface DictionaryItemRow extends RowDataPacket {
  id: number
  dictionary_id: number
  parent_id: number | null
  item_key: string
  label: string
  value: string
  sort_order: number
  is_enabled: number
  extra_json: string | null
  created_at: string
  updated_at: string
}

interface SystemSettingRow extends RowDataPacket {
  id: number
  scope: AdminScope
  group_code: string
  setting_key: string
  name: string
  value_type: SettingValueType
  value_text: string
  description: string | null
  is_public: number
  created_at: string
  updated_at: string
}

interface DictionaryItemTreeNode {
  id: number
  parentId: number | null
  itemKey: string
  label: string
  value: string
  sortOrder: number
  isEnabled: boolean
  extraJson: unknown | null
  createdAt: string
  updatedAt: string
  children: DictionaryItemTreeNode[]
}

/**
 * 解析 JSON 字段；为空时回退到指定默认值。
 *
 * @template T 返回值类型。
 * @param {string | null} value 原始 JSON 文本。
 * @param {T} fallback 回退值。
 * @returns {T} 解析结果或回退值。
 */
function parseJsonValue<T>(value: string | null, fallback: T) {
  if (!value) {
    return fallback
  }

  return JSON.parse(value) as T
}

/**
 * 将字典条目列表递归构造成树形结构。
 *
 * @param {DictionaryItemRow[]} rows 字典条目行集合。
 * @param {number | null} [parentId=null] 当前父节点 id。
 * @returns {DictionaryItemTreeNode[]} 树形字典条目列表。
 */
function buildDictionaryTree(rows: DictionaryItemRow[], parentId: number | null = null): DictionaryItemTreeNode[] {
  return rows
    .filter(item => item.parent_id === parentId)
    .map(item => ({
      id: item.id,
      parentId: item.parent_id,
      itemKey: item.item_key,
      label: item.label,
      value: item.value,
      sortOrder: item.sort_order,
      isEnabled: item.is_enabled === 1,
      extraJson: parseJsonValue(item.extra_json, null),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      children: buildDictionaryTree(rows, item.id),
    }))
}

/**
 * 查询指定字典下的全部条目。
 *
 * @param {number} dictionaryId 字典 id。
 * @returns {Promise<DictionaryItemRow[]>} 原始条目行列表。
 */
async function getDictionaryItems(dictionaryId: number) {
  const [rows] = await pool.query<DictionaryItemRow[]>(
    `
      SELECT id, dictionary_id, parent_id, item_key, label, value, sort_order, is_enabled, extra_json, created_at, updated_at
      FROM dictionary_items
      WHERE dictionary_id = :dictionaryId
      ORDER BY sort_order ASC, id ASC
    `,
    { dictionaryId },
  )

  return rows
}

/**
 * 返回演示用后台会话信息。
 *
 * @returns {Promise<{ authMode: 'demo', adminId: string, displayName: string, roleCode: string }>} 演示后台会话。
 */
export async function getAdminSession() {
  return {
    authMode: 'demo' as const,
    adminId: 'admin-demo-001',
    displayName: '演示管理员',
    roleCode: 'super-admin',
  }
}

/**
 * 获取后台字典列表及其树形条目。
 *
 * @returns {Promise<Array<{ id: number, code: string, name: string, scope: AdminScope, description: string | null, status: DictionaryStatus, itemCount: number, createdAt: string, updatedAt: string, items: DictionaryItemTreeNode[] }>>} 字典列表。
 */
export async function listDictionaries() {
  const [dictionaryRows] = await pool.query<DictionaryRow[]>(
    `
      SELECT id, code, name, scope, description, status, created_at, updated_at
      FROM dictionaries
      ORDER BY created_at ASC, id ASC
    `,
  )

  const [itemRows] = await pool.query<DictionaryItemRow[]>(
    `
      SELECT id, dictionary_id, parent_id, item_key, label, value, sort_order, is_enabled, extra_json, created_at, updated_at
      FROM dictionary_items
      ORDER BY dictionary_id ASC, sort_order ASC, id ASC
    `,
  )

  return dictionaryRows.map(dictionary => {
    const dictionaryItems = itemRows.filter(item => item.dictionary_id === dictionary.id)

    return {
      id: dictionary.id,
      code: dictionary.code,
      name: dictionary.name,
      scope: dictionary.scope,
      description: dictionary.description,
      status: dictionary.status,
      itemCount: dictionaryItems.length,
      createdAt: dictionary.created_at,
      updatedAt: dictionary.updated_at,
      items: buildDictionaryTree(dictionaryItems),
    }
  })
}

/**
 * 获取单个字典详情及其树形条目。
 *
 * @param {number} dictionaryId 字典 id。
 * @returns {Promise<{ id: number, code: string, name: string, scope: AdminScope, description: string | null, status: DictionaryStatus, itemCount: number, createdAt: string, updatedAt: string, items: DictionaryItemTreeNode[] } | null>} 字典详情或空值。
 */
export async function getDictionaryDetail(dictionaryId: number) {
  const [dictionaries] = await pool.query<DictionaryRow[]>(
    `
      SELECT id, code, name, scope, description, status, created_at, updated_at
      FROM dictionaries
      WHERE id = :dictionaryId
      LIMIT 1
    `,
    { dictionaryId },
  )

  const dictionary = dictionaries[0]

  if (!dictionary) {
    return null
  }

  const itemRows = await getDictionaryItems(dictionaryId)

  return {
    id: dictionary.id,
    code: dictionary.code,
    name: dictionary.name,
    scope: dictionary.scope,
    description: dictionary.description,
    status: dictionary.status,
    itemCount: itemRows.length,
    createdAt: dictionary.created_at,
    updatedAt: dictionary.updated_at,
    items: buildDictionaryTree(itemRows),
  }
}

/**
 * 按编码获取公开字典，并按 scope 回退共享字典。
 *
 * @param {string} code 字典编码。
 * @param {GetPublicDictionaryQuery} query 公开查询条件。
 * @returns {Promise<{ id: number, code: string, name: string, scope: AdminScope, description: string | null, status: DictionaryStatus, itemCount: number, createdAt: string, updatedAt: string, items: DictionaryItemTreeNode[] } | null>} 公开字典详情或空值。
 */
export async function getPublicDictionaryByCode(code: string, query: GetPublicDictionaryQuery) {
  const params: Record<string, string> = { code }
  const scopeClause = query.scope
    ? 'AND (scope = :scope OR scope = \'shared\')'
    : ''

  if (query.scope) {
    params.scope = query.scope
  }

  const [dictionaries] = await pool.query<DictionaryRow[]>(
    `
      SELECT id, code, name, scope, description, status, created_at, updated_at
      FROM dictionaries
      WHERE code = :code
        AND status = 'active'
        ${scopeClause}
      ORDER BY CASE WHEN scope = :scope THEN 0 ELSE 1 END, id ASC
      LIMIT 1
    `,
    query.scope ? params : { code },
  )

  const dictionary = dictionaries[0]

  if (!dictionary) {
    return null
  }

  const itemRows = await getDictionaryItems(dictionary.id)

  return {
    id: dictionary.id,
    code: dictionary.code,
    name: dictionary.name,
    scope: dictionary.scope,
    description: dictionary.description,
    status: dictionary.status,
    itemCount: itemRows.length,
    createdAt: dictionary.created_at,
    updatedAt: dictionary.updated_at,
    items: buildDictionaryTree(itemRows.filter(item => item.is_enabled === 1)),
  }
}

/**
 * 创建字典并返回完整详情。
 *
 * @param {CreateDictionaryInput} input 字典创建输入。
 * @returns {Promise<Awaited<ReturnType<typeof getDictionaryDetail>>>} 新建后的字典详情。
 */
export async function createDictionary(input: CreateDictionaryInput) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO dictionaries (code, name, scope, description, status)
      VALUES (:code, :name, :scope, :description, :status)
    `,
    {
      code: input.code,
      name: input.name,
      scope: input.scope,
      description: input.description ?? null,
      status: input.status,
    },
  )

  return getDictionaryDetail(Number(result.insertId))
}

/**
 * 更新指定字典并返回完整详情。
 *
 * @param {number} dictionaryId 字典 id。
 * @param {CreateDictionaryInput} input 字典更新输入。
 * @returns {Promise<Awaited<ReturnType<typeof getDictionaryDetail>>>} 更新后的字典详情。
 */
export async function updateDictionary(dictionaryId: number, input: CreateDictionaryInput) {
  await pool.query(
    `
      UPDATE dictionaries
      SET code = :code,
          name = :name,
          scope = :scope,
          description = :description,
          status = :status
      WHERE id = :dictionaryId
    `,
    {
      dictionaryId,
      code: input.code,
      name: input.name,
      scope: input.scope,
      description: input.description ?? null,
      status: input.status,
    },
  )

  return getDictionaryDetail(dictionaryId)
}

/**
 * 删除指定字典。
 *
 * @param {number} dictionaryId 字典 id。
 * @returns {Promise<boolean>} 为 true 表示删除成功。
 */
export async function deleteDictionary(dictionaryId: number) {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM dictionaries WHERE id = :dictionaryId',
    { dictionaryId },
  )

  return result.affectedRows > 0
}

/**
 * 为指定字典创建条目，并返回更新后的字典详情。
 *
 * @param {number} dictionaryId 字典 id。
 * @param {CreateDictionaryItemInput} input 条目创建输入。
 * @returns {Promise<Awaited<ReturnType<typeof getDictionaryDetail>>>} 更新后的字典详情。
 */
export async function createDictionaryItem(dictionaryId: number, input: CreateDictionaryItemInput) {
  await pool.query<ResultSetHeader>(
    `
      INSERT INTO dictionary_items (dictionary_id, parent_id, item_key, label, value, sort_order, is_enabled, extra_json)
      VALUES (:dictionaryId, :parentId, :itemKey, :label, :value, :sortOrder, :isEnabled, :extraJson)
    `,
    {
      dictionaryId,
      parentId: input.parentId ?? null,
      itemKey: input.itemKey,
      label: input.label,
      value: input.value,
      sortOrder: input.sortOrder,
      isEnabled: input.isEnabled ? 1 : 0,
      extraJson: input.extraJson === undefined ? null : JSON.stringify(input.extraJson),
    },
  )

  return getDictionaryDetail(dictionaryId)
}

/**
 * 根据字典条目 id 反查所属字典 id。
 *
 * @param {number} itemId 条目 id。
 * @returns {Promise<number | null>} 所属字典 id 或空值。
 */
async function getDictionaryIdByItemId(itemId: number) {
  const [items] = await pool.query<Array<RowDataPacket & { dictionary_id: number }>>(
    'SELECT dictionary_id FROM dictionary_items WHERE id = :itemId LIMIT 1',
    { itemId },
  )

  return items[0]?.dictionary_id ?? null
}

/**
 * 更新指定字典条目，并返回所属字典的最新详情。
 *
 * @param {number} itemId 条目 id。
 * @param {CreateDictionaryItemInput} input 条目更新输入。
 * @returns {Promise<Awaited<ReturnType<typeof getDictionaryDetail>>>} 更新后的字典详情。
 */
export async function updateDictionaryItem(itemId: number, input: CreateDictionaryItemInput) {
  const dictionaryId = await getDictionaryIdByItemId(itemId)

  if (!dictionaryId) {
    throw new Error('DICTIONARY_ITEM_NOT_FOUND')
  }

  await pool.query(
    `
      UPDATE dictionary_items
      SET parent_id = :parentId,
          item_key = :itemKey,
          label = :label,
          value = :value,
          sort_order = :sortOrder,
          is_enabled = :isEnabled,
          extra_json = :extraJson
      WHERE id = :itemId
    `,
    {
      itemId,
      parentId: input.parentId ?? null,
      itemKey: input.itemKey,
      label: input.label,
      value: input.value,
      sortOrder: input.sortOrder,
      isEnabled: input.isEnabled ? 1 : 0,
      extraJson: input.extraJson === undefined ? null : JSON.stringify(input.extraJson),
    },
  )

  return getDictionaryDetail(dictionaryId)
}

/**
 * 删除指定字典条目，并返回所属字典的最新详情。
 *
 * @param {number} itemId 条目 id。
 * @returns {Promise<Awaited<ReturnType<typeof getDictionaryDetail>>>} 更新后的字典详情。
 */
export async function deleteDictionaryItem(itemId: number) {
  const dictionaryId = await getDictionaryIdByItemId(itemId)

  if (!dictionaryId) {
    throw new Error('DICTIONARY_ITEM_NOT_FOUND')
  }

  await pool.query('DELETE FROM dictionary_items WHERE id = :itemId', { itemId })
  return getDictionaryDetail(dictionaryId)
}

/**
 * 根据条件查询后台系统参数列表。
 *
 * @param {ListSystemSettingsQuery} query 查询条件。
 * @returns {Promise<Array<{ id: number, scope: AdminScope, groupCode: string, settingKey: string, name: string, valueType: SettingValueType, valueText: string, description: string | null, isPublic: boolean, createdAt: string, updatedAt: string }>>} 系统参数列表。
 */
export async function listSystemSettings(query: ListSystemSettingsQuery) {
  const conditions: string[] = []
  const params: Record<string, string> = {}

  if (query.scope) {
    conditions.push('scope = :scope')
    params.scope = query.scope
  }

  if (query.groupCode) {
    conditions.push('group_code = :groupCode')
    params.groupCode = query.groupCode
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const [rows] = await pool.query<SystemSettingRow[]>(
    `
      SELECT id, scope, group_code, setting_key, name, value_type, value_text, description, is_public, created_at, updated_at
      FROM system_settings
      ${whereClause}
      ORDER BY scope ASC, group_code ASC, setting_key ASC
    `,
    params,
  )

  return rows.map(setting => ({
    id: setting.id,
    scope: setting.scope,
    groupCode: setting.group_code,
    settingKey: setting.setting_key,
    name: setting.name,
    valueType: setting.value_type,
    valueText: setting.value_text,
    description: setting.description,
    isPublic: setting.is_public === 1,
    createdAt: setting.created_at,
    updatedAt: setting.updated_at,
  }))
}

/**
 * 根据条件查询对外公开的系统参数列表。
 *
 * @param {ListPublicSystemSettingsQuery} query 查询条件。
 * @returns {Promise<Array<{ id: number, scope: AdminScope, groupCode: string, settingKey: string, name: string, valueType: SettingValueType, valueText: string, description: string | null, isPublic: boolean, createdAt: string, updatedAt: string }>>} 公开系统参数列表。
 */
export async function listPublicSystemSettings(query: ListPublicSystemSettingsQuery) {
  const conditions = ['is_public = 1']
  const params: Record<string, string> = {}

  if (query.scope) {
    conditions.push('(scope = :scope OR scope = \'shared\')')
    params.scope = query.scope
  }

  if (query.groupCode) {
    conditions.push('group_code = :groupCode')
    params.groupCode = query.groupCode
  }

  const [rows] = await pool.query<SystemSettingRow[]>(
    `
      SELECT id, scope, group_code, setting_key, name, value_type, value_text, description, is_public, created_at, updated_at
      FROM system_settings
      WHERE ${conditions.join(' AND ')}
      ORDER BY CASE WHEN scope = 'shared' THEN 0 ELSE 1 END, group_code ASC, setting_key ASC
    `,
    params,
  )

  return rows.map(setting => ({
    id: setting.id,
    scope: setting.scope,
    groupCode: setting.group_code,
    settingKey: setting.setting_key,
    name: setting.name,
    valueType: setting.value_type,
    valueText: setting.value_text,
    description: setting.description,
    isPublic: setting.is_public === 1,
    createdAt: setting.created_at,
    updatedAt: setting.updated_at,
  }))
}

/**
 * 获取单个系统参数详情。
 *
 * @param {number} settingId 系统参数 id。
 * @returns {Promise<{ id: number, scope: AdminScope, groupCode: string, settingKey: string, name: string, valueType: SettingValueType, valueText: string, description: string | null, isPublic: boolean, createdAt: string, updatedAt: string } | null>} 系统参数详情或空值。
 */
async function getSystemSettingDetail(settingId: number) {
  const [rows] = await pool.query<SystemSettingRow[]>(
    `
      SELECT id, scope, group_code, setting_key, name, value_type, value_text, description, is_public, created_at, updated_at
      FROM system_settings
      WHERE id = :settingId
      LIMIT 1
    `,
    { settingId },
  )

  const setting = rows[0]

  if (!setting) {
    return null
  }

  return {
    id: setting.id,
    scope: setting.scope,
    groupCode: setting.group_code,
    settingKey: setting.setting_key,
    name: setting.name,
    valueType: setting.value_type,
    valueText: setting.value_text,
    description: setting.description,
    isPublic: setting.is_public === 1,
    createdAt: setting.created_at,
    updatedAt: setting.updated_at,
  }
}

/**
 * 创建系统参数并返回详情。
 *
 * @param {CreateSystemSettingInput} input 系统参数创建输入。
 * @returns {Promise<Awaited<ReturnType<typeof getSystemSettingDetail>>>} 新建后的系统参数详情。
 */
export async function createSystemSetting(input: CreateSystemSettingInput) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO system_settings (scope, group_code, setting_key, name, value_type, value_text, description, is_public)
      VALUES (:scope, :groupCode, :settingKey, :name, :valueType, :valueText, :description, :isPublic)
    `,
    {
      scope: input.scope,
      groupCode: input.groupCode,
      settingKey: input.settingKey,
      name: input.name,
      valueType: input.valueType,
      valueText: input.valueText,
      description: input.description ?? null,
      isPublic: input.isPublic ? 1 : 0,
    },
  )

  return getSystemSettingDetail(Number(result.insertId))
}

/**
 * 更新指定系统参数并返回详情。
 *
 * @param {number} settingId 系统参数 id。
 * @param {CreateSystemSettingInput} input 系统参数更新输入。
 * @returns {Promise<Awaited<ReturnType<typeof getSystemSettingDetail>>>} 更新后的系统参数详情。
 */
export async function updateSystemSetting(settingId: number, input: CreateSystemSettingInput) {
  await pool.query(
    `
      UPDATE system_settings
      SET scope = :scope,
          group_code = :groupCode,
          setting_key = :settingKey,
          name = :name,
          value_type = :valueType,
          value_text = :valueText,
          description = :description,
          is_public = :isPublic
      WHERE id = :settingId
    `,
    {
      settingId,
      scope: input.scope,
      groupCode: input.groupCode,
      settingKey: input.settingKey,
      name: input.name,
      valueType: input.valueType,
      valueText: input.valueText,
      description: input.description ?? null,
      isPublic: input.isPublic ? 1 : 0,
    },
  )

  return getSystemSettingDetail(settingId)
}

/**
 * 删除指定系统参数。
 *
 * @param {number} settingId 系统参数 id。
 * @returns {Promise<boolean>} 为 true 表示删除成功。
 */
export async function deleteSystemSetting(settingId: number) {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM system_settings WHERE id = :settingId',
    { settingId },
  )

  return result.affectedRows > 0
}
