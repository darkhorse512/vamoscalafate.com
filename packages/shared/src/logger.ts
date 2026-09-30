/**
 * Structured JSON logging.
 *
 * PM2 captures stdout to a file that can be shipped to any log aggregator, so
 * one JSON object per line is the most useful format. In development the
 * output is a readable single line instead.
 *
 * Never pass passwords, API keys, session tokens or full card data as context -
 * `redact()` below scrubs well-known key names as a backstop, but the real
 * defence is not logging them in the first place.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown>

const SENSITIVE_KEY = /(password|secret|token|apikey|api_key|authorization|cookie|card|cvv|access_token)/i

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-limit]'
  if (value === null || typeof value !== 'object') return value

  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redact(val, depth + 1)
  }
  return out
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context ? { context: redact(context) as LogContext } : {}),
  }

  const line =
    process.env.NODE_ENV === 'development'
      ? `[${level.toUpperCase()}] ${message}${context ? ` ${JSON.stringify(redact(context))}` : ''}`
      : JSON.stringify(entry)

  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV !== 'production') write('debug', message, context)
  },
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, error?: unknown, context?: LogContext) => {
    const errorInfo =
      error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : error !== undefined
          ? { error: String(error) }
          : {}
    write('error', message, { ...context, ...errorInfo })
  },
  /** Child logger that stamps every entry with a fixed scope. */
  scoped(scope: string) {
    return {
      debug: (m: string, c?: LogContext) => logger.debug(m, { scope, ...c }),
      info: (m: string, c?: LogContext) => logger.info(m, { scope, ...c }),
      warn: (m: string, c?: LogContext) => logger.warn(m, { scope, ...c }),
      error: (m: string, e?: unknown, c?: LogContext) => logger.error(m, e, { scope, ...c }),
    }
  },
}
