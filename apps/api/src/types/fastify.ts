import type { ClientType } from '@mourned/domain'

export interface AuthContext {
  clientType: ClientType
  subjectType: 'user' | 'worker' | 'admin'
  subjectId: string
  openId?: string
  workerProfileId?: number
  adminUserId?: number
  adminUsername?: string
  roleCodes: string[]
  permissions: string[]
}

declare module 'fastify' {
  interface FastifyRequest {
    authContext: AuthContext
  }
}