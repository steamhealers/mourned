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

export async function registerUploadRoutes(app: FastifyInstance) {
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