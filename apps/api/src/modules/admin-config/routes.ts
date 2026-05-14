import type { FastifyInstance } from 'fastify'
import { requireAdminPermission, requireSubjectType } from '../../lib/security'
import { getAdminSessionProfile } from '../admin-access/repository'
import {
  createDictionary,
  createDictionaryItem,
  createSystemSetting,
  deleteDictionary,
  deleteDictionaryItem,
  deleteSystemSetting,
  getDictionaryDetail,
  getPublicDictionaryByCode,
  listDictionaries,
  listPublicSystemSettings,
  listSystemSettings,
  updateDictionary,
  updateDictionaryItem,
  updateSystemSetting,
} from './repository'
import {
  createDictionaryItemSchema,
  createDictionarySchema,
  createSystemSettingSchema,
  getPublicDictionaryQuerySchema,
  listPublicSystemSettingsQuerySchema,
  listSystemSettingsQuerySchema,
} from './types'

/**
 * 注册公开配置、字典以及后台配置管理路由。
 *
 * @param {FastifyInstance} app Fastify 应用实例。
 * @returns {Promise<void>} 路由注册完成后的 Promise。
 */
export async function registerAdminConfigRoutes(app: FastifyInstance) {
  /**
   * 返回对客户端公开的系统参数列表。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @returns {Promise<{ items: Awaited<ReturnType<typeof listPublicSystemSettings>> }>} 公开系统参数列表。
   */
  app.get('/public/system-settings', async (request) => {
    const query = listPublicSystemSettingsQuerySchema.parse(request.query)

    return {
      items: await listPublicSystemSettings(query),
    }
  })

  /**
   * 按编码返回对客户端公开的字典详情；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof getPublicDictionaryByCode>> } | import('fastify').FastifyReply>} 字典详情或错误响应。
   */
  app.get('/public/dictionaries/:code', async (request, reply) => {
    const code = (request.params as { code: string }).code
    const query = getPublicDictionaryQuerySchema.parse(request.query)
    const dictionary = await getPublicDictionaryByCode(code, query)

    if (!dictionary) {
      return reply.code(404).send({ message: 'DICTIONARY_NOT_FOUND' })
    }

    return { item: dictionary }
  })

  /**
   * 返回当前后台登录会话的菜单、角色和权限信息。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof getAdminSessionProfile>> } | void>} 会话详情或提前结束。
   */
  app.get('/admin/session', async (request, reply) => {
    if (!requireSubjectType(request, reply, ['admin'])) {
      return
    }

    return {
      item: await getAdminSessionProfile(request.authContext.adminUsername ?? request.authContext.subjectId),
    }
  })

  /**
   * 返回后台字典列表。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ items: Awaited<ReturnType<typeof listDictionaries>> } | void>} 字典列表或提前结束。
   */
  app.get('/admin/dictionaries', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'dictionaries:view')) {
      return
    }

    return {
      items: await listDictionaries(),
    }
  })

  /**
   * 返回单个后台字典详情；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof getDictionaryDetail>> } | import('fastify').FastifyReply | void>} 字典详情、错误响应或提前结束。
   */
  app.get('/admin/dictionaries/:dictionaryId', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'dictionaries:view')) {
      return
    }

    const dictionaryId = Number((request.params as { dictionaryId: string }).dictionaryId)
    const dictionary = await getDictionaryDetail(dictionaryId)

    if (!dictionary) {
      return reply.code(404).send({ message: 'DICTIONARY_NOT_FOUND' })
    }

    return { item: dictionary }
  })

  /**
   * 创建后台字典并返回新详情。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 创建响应或提前结束。
   */
  app.post('/admin/dictionaries', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'dictionaries.create')) {
      return
    }

    const input = createDictionarySchema.parse(request.body)
    const dictionary = await createDictionary(input)

    return reply.code(201).send({ item: dictionary })
  })

  /**
   * 更新后台字典；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof updateDictionary>> } | import('fastify').FastifyReply | void>} 更新结果、错误响应或提前结束。
   */
  app.put('/admin/dictionaries/:dictionaryId', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'dictionaries.edit')) {
      return
    }

    const dictionaryId = Number((request.params as { dictionaryId: string }).dictionaryId)
    const input = createDictionarySchema.parse(request.body)
    const dictionary = await updateDictionary(dictionaryId, input)

    if (!dictionary) {
      return reply.code(404).send({ message: 'DICTIONARY_NOT_FOUND' })
    }

    return { item: dictionary }
  })

  /**
   * 删除后台字典；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ success: true } | import('fastify').FastifyReply | void>} 删除结果、错误响应或提前结束。
   */
  app.delete('/admin/dictionaries/:dictionaryId', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'dictionaries.delete')) {
      return
    }

    const dictionaryId = Number((request.params as { dictionaryId: string }).dictionaryId)
    const success = await deleteDictionary(dictionaryId)

    if (!success) {
      return reply.code(404).send({ message: 'DICTIONARY_NOT_FOUND' })
    }

    return { success: true }
  })

  /**
   * 为字典新增条目。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 创建响应或提前结束。
   */
  app.post('/admin/dictionaries/:dictionaryId/items', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'dictionaries.item.create')) {
      return
    }

    const dictionaryId = Number((request.params as { dictionaryId: string }).dictionaryId)
    const input = createDictionaryItemSchema.parse(request.body)
    const dictionary = await createDictionaryItem(dictionaryId, input)

    return reply.code(201).send({ item: dictionary })
  })

  /**
   * 更新字典条目；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof updateDictionaryItem>> } | import('fastify').FastifyReply | void>} 更新结果、错误响应或提前结束。
   */
  app.put('/admin/dictionary-items/:itemId', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'dictionaries.item.edit')) {
      return
    }

    const itemId = Number((request.params as { itemId: string }).itemId)
    const input = createDictionaryItemSchema.parse(request.body)

    try {
      const dictionary = await updateDictionaryItem(itemId, input)
      return { item: dictionary }
    }
    catch (error) {
      if (error instanceof Error && error.message === 'DICTIONARY_ITEM_NOT_FOUND') {
        return reply.code(404).send({ message: error.message })
      }

      throw error
    }
  })

  /**
   * 删除字典条目；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof deleteDictionaryItem>> } | import('fastify').FastifyReply | void>} 删除结果、错误响应或提前结束。
   */
  app.delete('/admin/dictionary-items/:itemId', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'dictionaries.item.delete')) {
      return
    }

    const itemId = Number((request.params as { itemId: string }).itemId)

    try {
      const dictionary = await deleteDictionaryItem(itemId)
      return { item: dictionary }
    }
    catch (error) {
      if (error instanceof Error && error.message === 'DICTIONARY_ITEM_NOT_FOUND') {
        return reply.code(404).send({ message: error.message })
      }

      throw error
    }
  })

  /**
   * 返回后台系统参数列表。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ items: Awaited<ReturnType<typeof listSystemSettings>> } | void>} 参数列表或提前结束。
   */
  app.get('/admin/system-settings', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'settings:view')) {
      return
    }

    const query = listSystemSettingsQuerySchema.parse(request.query)

    return {
      items: await listSystemSettings(query),
    }
  })

  /**
   * 创建系统参数。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 创建响应或提前结束。
   */
  app.post('/admin/system-settings', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'settings.create')) {
      return
    }

    const input = createSystemSettingSchema.parse(request.body)
    const setting = await createSystemSetting(input)

    return reply.code(201).send({ item: setting })
  })

  /**
   * 更新系统参数；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ item: Awaited<ReturnType<typeof updateSystemSetting>> } | import('fastify').FastifyReply | void>} 更新结果、错误响应或提前结束。
   */
  app.put('/admin/system-settings/:settingId', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'settings.edit')) {
      return
    }

    const settingId = Number((request.params as { settingId: string }).settingId)
    const input = createSystemSettingSchema.parse(request.body)
    const setting = await updateSystemSetting(settingId, input)

    if (!setting) {
      return reply.code(404).send({ message: 'SYSTEM_SETTING_NOT_FOUND' })
    }

    return { item: setting }
  })

  /**
   * 删除系统参数；找不到时返回 404。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<{ success: true } | import('fastify').FastifyReply | void>} 删除结果、错误响应或提前结束。
   */
  app.delete('/admin/system-settings/:settingId', async (request, reply) => {
    if (!requireAdminPermission(request, reply, 'settings.delete')) {
      return
    }

    const settingId = Number((request.params as { settingId: string }).settingId)
    const success = await deleteSystemSetting(settingId)

    if (!success) {
      return reply.code(404).send({ message: 'SYSTEM_SETTING_NOT_FOUND' })
    }

    return { success: true }
  })
}
