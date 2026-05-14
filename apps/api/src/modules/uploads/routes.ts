import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.resolve(currentDir, '../../uploads')
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * 根据原始文件名和 MIME 类型推断上传文件扩展名。
 *
 * @param {string} filename 原始文件名。
 * @param {string} mimetype 上传文件的 MIME 类型。
 * @returns {string} 最终写盘使用的扩展名。
 */
function resolveExtension(filename: string, mimetype: string) {
  const fileExt = path.extname(filename).toLowerCase()

  if (fileExt) {
    return fileExt
  }

  if (mimetype === 'image/png') {
    return '.png'
  }

  if (mimetype === 'image/webp') {
    return '.webp'
  }

  return '.jpg'
}

/**
 * 注册文件上传路由。
 *
 * @param {FastifyInstance} app Fastify 应用实例。
 * @returns {Promise<void>} 路由注册完成后的 Promise。
 */
export async function registerUploadRoutes(app: FastifyInstance) {
  /**
   * 接收图片文件并写入本地上传目录，成功后返回可访问的静态文件地址。
   *
   * @param {import('fastify').FastifyRequest} request 当前上传请求对象。
   * @param {import('fastify').FastifyReply} reply 当前响应对象。
   * @returns {Promise<import('fastify').FastifyReply>} 上传成功或失败时返回的响应结果。
   */
  app.post('/uploads', async (request, reply) => {
    const file = await request.file()

    if (!file) {
      return reply.code(400).send({ message: 'FILE_REQUIRED' })
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      return reply.code(400).send({ message: 'UNSUPPORTED_FILE_TYPE' })
    }

    await mkdir(uploadDir, { recursive: true })

    const fileName = `${Date.now()}-${randomUUID()}${resolveExtension(file.filename, file.mimetype)}`
    const targetPath = path.join(uploadDir, fileName)

    await pipeline(file.file, createWriteStream(targetPath))

    return reply.code(201).send({
      item: {
        fileName,
        url: `/files/${fileName}`,
      },
    })
  })
}