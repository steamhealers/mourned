import type { FastifyInstance } from 'fastify'
import { signAccessToken } from '../../lib/security'
import { loginAdmin, loginUser, loginWorker } from './repository'
import { adminLoginSchema, userLoginSchema, workerLoginSchema } from './types'

/**
 * 注册三端登录路由，并在登录成功后签发对应主体的访问令牌。
 *
 * @param {FastifyInstance} app Fastify 应用实例。
 * @returns {Promise<void>} 路由注册完成后的 Promise。
 */
export async function registerAuthRoutes(app: FastifyInstance) {
  /**
   * 处理用户端登录并签发用户身份 JWT。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 登录结果响应或提前结束。
   */
  app.post('/auth/user/login', async (request, reply) => {
    const input = userLoginSchema.parse(request.body)

    try {
      const result = await loginUser(input)
      return reply.send({
        token: signAccessToken({
          clientType: 'user-miniapp',
          subjectType: 'user',
          subjectId: String(result.userId),
          openId: result.openId,
          roleCodes: [],
          permissions: [],
        }),
        session: result.session,
      })
    }
    catch (error) {
      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        return reply.code(404).send({ message: error.message })
      }

      throw error
    }
  })

  /**
   * 处理代办员端登录并签发代办员身份 JWT。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 登录结果响应或提前结束。
   */
  app.post('/auth/worker/login', async (request, reply) => {
    const input = workerLoginSchema.parse(request.body)

    try {
      const result = await loginWorker(input)
      return reply.send({
        token: signAccessToken({
          clientType: 'worker-miniapp',
          subjectType: 'worker',
          subjectId: String(result.workerProfileId),
          openId: result.openId,
          workerProfileId: result.workerProfileId,
          roleCodes: [],
          permissions: [],
        }),
        session: result.session,
      })
    }
    catch (error) {
      if (error instanceof Error && error.message === 'WORKER_NOT_FOUND') {
        return reply.code(404).send({ message: error.message })
      }

      throw error
    }
  })

  /**
   * 处理后台登录并签发携带角色与权限列表的管理员 JWT。
   *
   * @param {import('fastify').FastifyRequest} request 当前请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply | void>} 登录结果响应或提前结束。
   */
  app.post('/auth/admin/login', async (request, reply) => {
    const input = adminLoginSchema.parse(request.body)

    try {
      const result = await loginAdmin(input)
      return reply.send({
        token: signAccessToken({
          clientType: 'admin-web',
          subjectType: 'admin',
          subjectId: result.username,
          adminUserId: result.adminUserId,
          adminUsername: result.username,
          roleCodes: result.session.roleCodes,
          permissions: result.session.permissions,
        }),
        session: result.session,
      })
    }
    catch (error) {
      if (error instanceof Error && ['ADMIN_USER_NOT_FOUND', 'ADMIN_PASSWORD_INVALID'].includes(error.message)) {
        return reply.code(401).send({ message: error.message })
      }

      throw error
    }
  })
}