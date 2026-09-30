/**
 * Application error taxonomy.
 *
 * Every error carries a `publicMessage` that is safe to show a visitor and a
 * `code` used for logging and tests. Anything not in this taxonomy is treated
 * as unexpected and surfaces to the user as a generic message, so stack traces
 * and database internals never leak into a response.
 */

export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'SOLD_OUT'
  | 'PAYMENT_ERROR'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'EMAIL_ERROR'
  | 'INTERNAL_ERROR'

const DEFAULT_STATUS: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  SOLD_OUT: 409,
  PAYMENT_ERROR: 402,
  PROVIDER_NOT_CONFIGURED: 503,
  EMAIL_ERROR: 502,
  INTERNAL_ERROR: 500,
}

const DEFAULT_PUBLIC_MESSAGE: Record<AppErrorCode, string> = {
  VALIDATION_ERROR: 'Revisá los datos ingresados e intentá nuevamente.',
  NOT_FOUND: 'No encontramos lo que estabas buscando.',
  UNAUTHORIZED: 'Necesitás iniciar sesión para continuar.',
  FORBIDDEN: 'No tenés permisos para realizar esta acción.',
  RATE_LIMITED: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.',
  CONFLICT: 'El estado actual no permite completar esta operación.',
  SOLD_OUT: 'No quedan lugares disponibles para la fecha seleccionada.',
  PAYMENT_ERROR: 'No pudimos procesar el pago. Probá con otro medio de pago.',
  PROVIDER_NOT_CONFIGURED: 'El medio de pago no está disponible en este momento.',
  EMAIL_ERROR: 'No pudimos enviar el correo. Tu solicitud se registró igualmente.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado. Por favor intentá nuevamente.',
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly publicMessage: string
  readonly details?: Record<string, unknown>

  constructor(
    code: AppErrorCode,
    message?: string,
    options: { publicMessage?: string; details?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(message ?? DEFAULT_PUBLIC_MESSAGE[code], { cause: options.cause })
    this.name = 'AppError'
    this.code = code
    this.status = DEFAULT_STATUS[code]
    this.publicMessage = options.publicMessage ?? DEFAULT_PUBLIC_MESSAGE[code]
    this.details = options.details
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Normalises any thrown value into a response-safe shape. Unknown errors are
 * deliberately flattened to INTERNAL_ERROR so their message never reaches the
 * browser - log the original separately.
 */
export function toPublicError(error: unknown): {
  code: AppErrorCode
  status: number
  message: string
  details?: Record<string, unknown>
} {
  if (isAppError(error)) {
    return {
      code: error.code,
      status: error.status,
      message: error.publicMessage,
      ...(error.details ? { details: error.details } : {}),
    }
  }
  return {
    code: 'INTERNAL_ERROR',
    status: 500,
    message: DEFAULT_PUBLIC_MESSAGE.INTERNAL_ERROR,
  }
}

/** Discriminated result used by every server action. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: AppErrorCode; message: string; fieldErrors?: Record<string, string[]> }

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

export function actionError(
  code: AppErrorCode,
  message?: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return {
    ok: false,
    code,
    message: message ?? DEFAULT_PUBLIC_MESSAGE[code],
    ...(fieldErrors ? { fieldErrors } : {}),
  }
}
