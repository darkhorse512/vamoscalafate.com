import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma, type AdminRole } from '@vamos/db'
import { AppError, logger, serverEnv, can, type Permission } from '@vamos/shared'
import { checkRateLimit, RATE_LIMITS, resetRateLimit } from '@vamos/shared/rate-limit'
import { loginSchema } from '@vamos/validation'
import { recordAudit } from './audit'

const log = logger.scoped('auth')

export const SESSION_COOKIE = 'vc_admin_session'

/**
 * Admin authentication.
 *
 * Design decisions:
 *
 *  · Sessions are DATABASE-BACKED, not stateless JWTs. An administrator who is
 *    deactivated or whose session is revoked loses access on their very next
 *    request; a signed token would stay valid until it expired.
 *
 *  · The cookie holds a 256-bit random token. Only its SHA-256 hash is stored,
 *    so a database dump cannot be replayed as a live session.
 *
 *  · The cookie is httpOnly (no JavaScript access, so XSS cannot steal it),
 *    secure in production, and SameSite=Lax — which blocks cross-site POSTs
 *    and is the primary CSRF defence for Server Actions here.
 *
 *  · Failed logins are counted per account AND rate-limited per IP, so neither
 *    password spraying nor brute force against one account is cheap.
 */

const MAX_FAILED_ATTEMPTS = 8
const LOCKOUT_MINUTES = 15

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export type SessionUser = {
  id: string
  email: string
  name: string
  role: AdminRole
}

/**
 * Reads and validates the current session.
 * Returns null rather than throwing, so callers choose how to react.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: { id: true, email: true, name: true, role: true, isActive: true } },
    },
  })

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null
  // A deactivated account must lose access immediately, mid-session.
  if (!session.user.isActive) return null

  // Throttled activity tracking: updating on every request would write on
  // every page view for no operational benefit.
  void prisma.adminSession
    .updateMany({
      where: { id: session.id, lastSeenAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => undefined)

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  }
}

/** Session or redirect to login. Use at the top of every protected page. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

/**
 * Authorization gate for a specific capability.
 *
 * Called inside every protected page AND every mutating server action. Doing
 * it only in middleware would be insufficient: a Server Action is an HTTP
 * endpoint that a determined caller can invoke directly.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const session = await requireSession()

  if (!can(session.role, permission)) {
    log.warn('Authorization denied', {
      userId: session.id,
      role: session.role,
      permission,
    })
    throw new AppError('FORBIDDEN', `Missing permission: ${permission}`)
  }

  return session
}

/** Non-throwing variant, for conditionally rendering UI affordances. */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const session = await getSession()
  return session ? can(session.role, permission) : false
}

export type LoginOutcome =
  | { ok: true }
  | { ok: false; message: string }

export async function login(input: unknown): Promise<LoginOutcome> {
  const requestHeaders = await headers()
  const ip =
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    requestHeaders.get('x-real-ip') ??
    'unknown'

  const limit = await checkRateLimit(RATE_LIMITS.login, ip)
  if (!limit.allowed) {
    log.warn('Login rate limit exceeded', { ip })
    return {
      ok: false,
      message: `Demasiados intentos. Esperá ${Math.ceil(limit.retryAfterSeconds / 60)} minutos.`,
    }
  }

  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: 'Ingresá un email y una contraseña válidos.' }
  }

  const { email, password } = parsed.data

  const user = await prisma.adminUser.findUnique({
    where: { email },
    select: {
      id: true, email: true, name: true, role: true, passwordHash: true,
      isActive: true, failedLoginAttempts: true, lockedUntil: true,
    },
  })

  /**
   * A single generic message for every failure path — unknown account, wrong
   * password, locked, deactivated. Distinguishing them would let an attacker
   * enumerate valid administrator addresses.
   */
  const GENERIC_FAILURE = 'Email o contraseña incorrectos.'

  if (!user) {
    // Compare against a dummy hash anyway, so a missing account does not
    // return measurably faster than a wrong password.
    await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv')
    log.warn('Login attempt for unknown account', { ip })
    await recordAudit({
      action: 'LOGIN_FAILED',
      entityType: 'AdminUser',
      summary: `Intento de acceso fallido para ${email}`,
      actorEmail: email,
      ipAddress: ip,
    })
    return { ok: false, message: GENERIC_FAILURE }
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    log.warn('Login attempt on locked account', { userId: user.id, ip })
    return { ok: false, message: GENERIC_FAILURE }
  }

  if (!user.isActive) {
    log.warn('Login attempt on deactivated account', { userId: user.id, ip })
    return { ok: false, message: GENERIC_FAILURE }
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash)

  if (!passwordValid) {
    const attempts = user.failedLoginAttempts + 1
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        ...(shouldLock
          ? { lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000) }
          : {}),
      },
    })

    log.warn('Failed login', { userId: user.id, attempts, locked: shouldLock, ip })

    await recordAudit({
      action: 'LOGIN_FAILED',
      entityType: 'AdminUser',
      entityId: user.id,
      summary: `Contraseña incorrecta (intento ${attempts})`,
      actorId: user.id,
      actorEmail: user.email,
      ipAddress: ip,
    })

    return { ok: false, message: GENERIC_FAILURE }
  }

  // Success: mint a session.
  const token = randomBytes(32).toString('base64url')
  const ttlSeconds = serverEnv().AUTH_SESSION_TTL_SECONDS
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

  await prisma.$transaction([
    prisma.adminSession.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt,
        ipAddress: ip,
        userAgent: requestHeaders.get('user-agent')?.slice(0, 500) ?? null,
      },
    }),
    prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    }),
  ])

  const cookieStore = await cookies()
  const env = serverEnv()

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
    ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
  })

  await resetRateLimit(RATE_LIMITS.login, ip)

  log.info('Login succeeded', { userId: user.id, role: user.role })

  await recordAudit({
    action: 'LOGIN',
    entityType: 'AdminUser',
    entityId: user.id,
    summary: `${user.name} inició sesión`,
    actorId: user.id,
    actorEmail: user.email,
    ipAddress: ip,
  })

  return { ok: true }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (token) {
    const session = await prisma.adminSession.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, user: { select: { email: true, name: true } } },
    })

    if (session) {
      // Revoked rather than deleted, so the sign-out remains in the trail.
      await prisma.adminSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      })

      await recordAudit({
        action: 'LOGOUT',
        entityType: 'AdminUser',
        entityId: session.userId,
        summary: `${session.user.name} cerró sesión`,
        actorId: session.userId,
        actorEmail: session.user.email,
      })
    }
  }

  cookieStore.delete(SESSION_COOKIE)
}

/** Revokes every session for a user — used when deactivating an account. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.adminSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

/** Housekeeping for expired session rows. */
export async function pruneSessions(): Promise<number> {
  const { count } = await prisma.adminSession.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 7 * 86_400_000) } },
  })
  return count
}

/** Constant-time compare, for any other secret this app has to check. */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}
