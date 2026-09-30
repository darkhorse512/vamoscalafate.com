import { z } from 'zod'
import { cuidSchema, emailSchema, safeTextSchema } from './common.ts'

export const loginSchema = z.object({
  email: emailSchema,
  /**
   * No max-length complexity rules on login - the password either matches the
   * stored hash or it does not. Policy is enforced when a password is *set*.
   */
  password: z.string().min(1, 'Ingresá tu contraseña').max(200),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Password policy for creating or changing credentials.
 * Length is weighted over character-class gymnastics, per current NIST guidance.
 */
export const passwordSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(200, 'La contraseña es demasiado larga')
  .refine((v) => /[a-z]/.test(v), 'Incluí al menos una letra minúscula')
  .refine((v) => /[A-Z]/.test(v), 'Incluí al menos una letra mayúscula')
  .refine((v) => /\d/.test(v), 'Incluí al menos un número')

export const adminRoleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'EDITOR',
  'BOOKING_MANAGER',
  'CONTENT_MANAGER',
])

export const adminUserCreateSchema = z.object({
  name: safeTextSchema(2, 120, 'El nombre'),
  email: emailSchema,
  password: passwordSchema,
  role: adminRoleSchema,
  isActive: z.boolean().default(true),
})

export const adminUserUpdateSchema = z.object({
  id: cuidSchema,
  name: safeTextSchema(2, 120, 'El nombre'),
  email: emailSchema,
  role: adminRoleSchema,
  isActive: z.boolean(),
  /** Optional - only rotates the password when non-empty. */
  password: z.union([passwordSchema, z.literal('')]).optional(),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Repetí la nueva contraseña'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  })
