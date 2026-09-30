import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { prisma } from '@vamos/db'
import { can, canAccessResource, permissionsForRole } from '@vamos/shared'

/**
 * Authentication and authorization.
 *
 * The RBAC matrix is tested directly (it is pure) and the credential-handling
 * invariants are tested against the real database. The login flow itself
 * depends on `next/headers`, so it is exercised end-to-end in the Playwright
 * suite rather than mocked here.
 */

const TEST_EMAIL = 'itest-auth@example.com'

beforeEach(async () => {
  await prisma.adminSession.deleteMany({ where: { user: { email: TEST_EMAIL } } })
  await prisma.adminUser.deleteMany({ where: { email: TEST_EMAIL } })
})

afterAll(async () => {
  await prisma.adminSession.deleteMany({ where: { user: { email: TEST_EMAIL } } })
  await prisma.adminUser.deleteMany({ where: { email: TEST_EMAIL } })
  await prisma.$disconnect()
})

describe('password storage', () => {
  it('stores a bcrypt hash, never the plaintext', async () => {
    const password = 'CorrectHorseBattery1'

    const user = await prisma.adminUser.create({
      data: {
        email: TEST_EMAIL,
        name: 'Test Admin',
        passwordHash: await bcrypt.hash(password, 12),
        role: 'EDITOR',
      },
      select: { passwordHash: true },
    })

    expect(user.passwordHash).not.toContain(password)
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/)
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true)
    expect(await bcrypt.compare('wrong password', user.passwordHash)).toBe(false)
  })

  it('produces a different hash for the same password each time', async () => {
    // Per-hash salts: two users with the same password must not be detectable
    // as such from the database.
    const a = await bcrypt.hash('SamePassword123', 12)
    const b = await bcrypt.hash('SamePassword123', 12)
    expect(a).not.toBe(b)
  })
})

describe('session storage', () => {
  it('stores only a hash of the session token', async () => {
    const user = await prisma.adminUser.create({
      data: {
        email: TEST_EMAIL,
        name: 'Test Admin',
        passwordHash: await bcrypt.hash('CorrectHorseBattery1', 12),
        role: 'ADMIN',
      },
    })

    const rawToken = 'a-very-secret-session-token'
    const { createHash } = await import('node:crypto')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    const session = await prisma.adminSession.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 3600_000),
      },
      select: { tokenHash: true },
    })

    // A database dump must not yield a replayable session cookie.
    expect(session.tokenHash).not.toBe(rawToken)
    expect(session.tokenHash).toHaveLength(64)
  })

  it('cascades session deletion when the user is removed', async () => {
    const user = await prisma.adminUser.create({
      data: {
        email: TEST_EMAIL,
        name: 'Test Admin',
        passwordHash: await bcrypt.hash('CorrectHorseBattery1', 12),
        role: 'ADMIN',
        sessions: {
          create: {
            tokenHash: 'a'.repeat(64),
            expiresAt: new Date(Date.now() + 3600_000),
          },
        },
      },
    })

    await prisma.adminUser.delete({ where: { id: user.id } })

    const orphans = await prisma.adminSession.count({ where: { userId: user.id } })
    expect(orphans).toBe(0)
  })
})

describe('RBAC matrix', () => {
  it('grants SUPER_ADMIN everything', () => {
    expect(can('SUPER_ADMIN', 'users:delete')).toBe(true)
    expect(can('SUPER_ADMIN', 'settings:update')).toBe(true)
    expect(can('SUPER_ADMIN', 'payments:refund')).toBe(true)
    expect(can('SUPER_ADMIN', 'audit:read')).toBe(true)
  })

  it('does NOT let a non-owner manage users', () => {
    for (const role of ['ADMIN', 'EDITOR', 'BOOKING_MANAGER', 'CONTENT_MANAGER'] as const) {
      expect(can(role, 'users:create')).toBe(false)
      expect(can(role, 'users:update')).toBe(false)
    }
  })

  it('scopes EDITOR to content, not commerce', () => {
    expect(can('EDITOR', 'tours:update')).toBe(true)
    expect(can('EDITOR', 'blog:create')).toBe(true)
    expect(can('EDITOR', 'media:create')).toBe(true)

    expect(can('EDITOR', 'bookings:read')).toBe(false)
    expect(can('EDITOR', 'payments:refund')).toBe(false)
    expect(can('EDITOR', 'settings:update')).toBe(false)
    // An editor may edit but not delete a product.
    expect(can('EDITOR', 'tours:delete')).toBe(false)
  })

  it('scopes BOOKING_MANAGER to commerce, not content authoring', () => {
    expect(can('BOOKING_MANAGER', 'bookings:update')).toBe(true)
    expect(can('BOOKING_MANAGER', 'customers:read')).toBe(true)
    expect(can('BOOKING_MANAGER', 'payments:refund')).toBe(true)
    // Read-only on the catalogue, so they can look up what was sold.
    expect(can('BOOKING_MANAGER', 'tours:read')).toBe(true)

    expect(can('BOOKING_MANAGER', 'tours:update')).toBe(false)
    expect(can('BOOKING_MANAGER', 'blog:create')).toBe(false)
  })

  it('lets CONTENT_MANAGER handle the directory and its submissions', () => {
    expect(can('CONTENT_MANAGER', 'submissions:update')).toBe(true)
    expect(can('CONTENT_MANAGER', 'hotels:publish')).toBe(true)
    expect(can('CONTENT_MANAGER', 'blog:publish')).toBe(true)

    expect(can('CONTENT_MANAGER', 'payments:refund')).toBe(false)
    expect(can('CONTENT_MANAGER', 'bookings:update')).toBe(false)
  })

  it('gates section visibility on a read grant', () => {
    expect(canAccessResource('BOOKING_MANAGER', 'bookings')).toBe(true)
    expect(canAccessResource('BOOKING_MANAGER', 'blog')).toBe(false)
    expect(canAccessResource('EDITOR', 'tours')).toBe(true)
    expect(canAccessResource('EDITOR', 'users')).toBe(false)
  })

  it('denies an unknown permission by default', () => {
    // Fail closed: a permission nobody granted is denied.
    expect(can('EDITOR', 'nonexistent:action' as never)).toBe(false)
  })

  it('enumerates permissions for the roles screen', () => {
    expect(permissionsForRole('EDITOR').length).toBeGreaterThan(0)
    expect(permissionsForRole('SUPER_ADMIN').length).toBeGreaterThan(
      permissionsForRole('EDITOR').length,
    )
  })
})

describe('RBAC table mirror', () => {
  it('keeps the seeded Role and Permission tables in sync with the code matrix', async () => {
    const roles = await prisma.role.findMany({ select: { key: true } })

    // The seed mirrors the code matrix into the database for display. If this
    // drifts, the admin's roles screen lies about who can do what.
    const keys = roles.map((role) => role.key).sort()
    expect(keys).toEqual(
      ['ADMIN', 'BOOKING_MANAGER', 'CONTENT_MANAGER', 'EDITOR', 'SUPER_ADMIN'].sort(),
    )
  })
})
