import 'server-only'
import { headers } from 'next/headers'
import { prisma, type AuditAction } from '@vamos/db'
import { logger } from '@vamos/shared'

const log = logger.scoped('audit')

/**
 * Audit trail.
 *
 * Records who did what, when, to which entity, and the before/after state —
 * the five facts spec §47 requires.
 *
 * Writing an audit entry must NEVER fail the operation it describes: a
 * logging outage would otherwise block every admin action. Failures are
 * logged loudly instead.
 */

const SENSITIVE_FIELDS = new Set([
  'passwordHash', 'password', 'tokenHash', 'token',
  'providerPayload', 'secret', 'apiKey',
])

/**
 * Strips secrets and truncates long text before a snapshot is persisted.
 * A tour's 20 000-character description has no diagnostic value in an audit
 * row and would bloat the table.
 */
function sanitizeSnapshot(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[depth-limit]'
  if (value === null || value === undefined) return value

  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value
  if (typeof value !== 'object') return value

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeSnapshot(item, depth + 1))
  }

  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key)) {
      out[key] = '[redacted]'
      continue
    }
    out[key] = sanitizeSnapshot(item, depth + 1)
  }
  return out
}

export type AuditInput = {
  action: AuditAction
  entityType: string
  entityId?: string | null
  summary: string
  before?: unknown
  after?: unknown
  actorId?: string | null
  actorEmail?: string | null
  ipAddress?: string | null
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    let ipAddress = input.ipAddress ?? null
    let userAgent: string | null = null

    // `headers()` throws outside a request scope (e.g. a background job), so
    // the lookup is optional.
    try {
      const requestHeaders = await headers()
      ipAddress =
        ipAddress ??
        requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        requestHeaders.get('x-real-ip') ??
        null
      userAgent = requestHeaders.get('user-agent')?.slice(0, 500) ?? null
    } catch {
      // Not in a request context. Fine.
    }

    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary.slice(0, 500),
        before: input.before !== undefined ? (sanitizeSnapshot(input.before) as object) : undefined,
        after: input.after !== undefined ? (sanitizeSnapshot(input.after) as object) : undefined,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    log.error('Failed to write audit entry — action itself was NOT rolled back', error, {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
    })
  }
}
