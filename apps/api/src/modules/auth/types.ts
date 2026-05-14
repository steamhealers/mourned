import { z } from 'zod'

export const userLoginSchema = z.object({
  openId: z.string().min(1).max(64),
})

export const workerLoginSchema = z.object({
  workerProfileId: z.number().int().positive(),
})

export const adminLoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(255),
})

export type UserLoginInput = z.infer<typeof userLoginSchema>
export type WorkerLoginInput = z.infer<typeof workerLoginSchema>
export type AdminLoginInput = z.infer<typeof adminLoginSchema>