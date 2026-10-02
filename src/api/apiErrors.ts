/**
 * Centralized API Error Handling & Error Sanitization Utility
 *
 * Implements strict security, privacy, and UX rules:
 * 1. Safe custom backend messages (e.g. "Session expired", "Unable to fetch PNR") are preserved.
 * 2. Raw technical errors (stack traces, Python exceptions, database errors, Cloud Run errors,
 *    CRIS/NTES technical markup) are sanitized to clean user messages.
 * 3. Connection and network failures (ERR_NETWORK, Failed to fetch, Connection Refused, etc.)
 *    are mapped centrally to: "Server is temporarily unavailable. Please try again in a moment."
 * 4. Request timeouts (AbortError, 408, 504) are mapped centrally to:
 *    "Server is taking too long to respond. Please try again."
 * 5. Under NO circumstance is the backend API URL, host, port, or upstream endpoint exposed to users.
 */

export const SERVER_UNAVAILABLE_MESSAGE =
  'Server is temporarily unavailable. Please try again in a moment.';

export const SERVER_TIMEOUT_MESSAGE =
  'Server is taking too long to respond. Please try again.';

export const SERVER_GENERIC_ERROR_MESSAGE =
  'Unable to complete request right now. Please try again in a moment.';

/**
 * Checks whether an error is a timeout or abort caused by timeout.
 */
export function isTimeoutError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
    const lower = (err.message || '').toLowerCase();
    if (
      lower.includes('timeout') ||
      lower.includes('timed out') ||
      lower.includes('time out') ||
      lower.includes('err_connection_timed_out') ||
      lower.includes('etimedout')
    ) {
      return true;
    }
  }
  const str = String(err).toLowerCase();
  return (
    str.includes('timeout') ||
    str.includes('timed out') ||
    str.includes('time out') ||
    str.includes('err_connection_timed_out') ||
    str.includes('etimedout')
  );
}

/**
 * Checks whether an error represents a network or connection failure
 * where the frontend could not reach the backend server.
 */
export function isNetworkOrConnectionError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = (msg || '').toLowerCase();

  return (
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('networkerror') ||
    lower.includes('err_network') ||
    lower.includes('err_connection_refused') ||
    lower.includes('err_connection_reset') ||
    lower.includes('err_connection_closed') ||
    lower.includes('err_connection_aborted') ||
    lower.includes('connection refused') ||
    lower.includes('connection reset') ||
    lower.includes('econnrefused') ||
    lower.includes('econnreset') ||
    lower.includes('unreachable') ||
    lower.includes('name not resolved') ||
    lower.includes('err_name_not_resolved') ||
    lower.includes('dns') ||
    lower.includes('load failed') ||
    lower.includes('network request failed') ||
    lower.includes('cannot connect to') ||
    lower.includes('could not reach')
  );
}

/**
 * Detects if a message contains raw technical backend artifacts,
 * stack traces, internal exceptions, database errors, or URLs.
 */
export function isRawTechnicalError(message: string): boolean {
  if (!message || typeof message !== 'string') return true;
  const lower = message.toLowerCase();

  // 1. Stack traces & Python / JavaScript runtime exceptions
  if (
    lower.includes('traceback (most recent call last)') ||
    (lower.includes('file "') && lower.includes(', line ')) ||
    lower.includes('typeerror') ||
    lower.includes('valueerror') ||
    lower.includes('keyerror') ||
    lower.includes('attributeerror') ||
    lower.includes('zerodivisionerror') ||
    lower.includes('httpexception') ||
    lower.includes('syntaxerror') ||
    lower.includes('nameerror') ||
    lower.includes('runtimeerror') ||
    lower.includes('uncaught exception') ||
    lower.includes('nullpointerexception')
  ) {
    return true;
  }

  // 2. Database errors & ORM internals
  if (
    lower.includes('psycopg2') ||
    lower.includes('sqlalchemy') ||
    lower.includes('sqlite') ||
    lower.includes('drizzle') ||
    lower.includes('pg_') ||
    lower.includes('relation "') ||
    lower.includes('syntax error at or near') ||
    lower.includes('database error')
  ) {
    return true;
  }

  // 3. Cloud Provider / Gateway proxy raw errors
  if (
    lower.includes('upstream connect error') ||
    lower.includes('upstream request timeout') ||
    lower.includes('cloud run') ||
    lower.includes('cloudflare') ||
    lower.includes('bad gateway') ||
    lower.includes('gateway timeout') ||
    lower.includes('502 bad gateway') ||
    lower.includes('503 service unavailable') ||
    lower.includes('504 gateway time-out')
  ) {
    return true;
  }

  // 4. NTES / CRIS raw technical responses and markup
  if (
    lower.includes('<!doctype') ||
    lower.includes('<html') ||
    lower.includes('<?xml') ||
    lower.includes('<response') ||
    lower.includes('cris xml') ||
    lower.includes('cris server') ||
    lower.includes('cris parsing')
  ) {
    return true;
  }

  // 5. Exposes raw URLs or local hostnames
  if (
    lower.includes('http://') ||
    lower.includes('https://') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('.onrender.com') ||
    lower.includes('.run.app')
  ) {
    return true;
  }

  return false;
}

/**
 * Sanitizes backend response errors or raw strings according to requirements:
 * - If backend cannot be reached or timeout: returns standardized generic message.
 * - If backend returned safe custom detail (e.g. "Session expired"): preserves it.
 * - If raw technical detail: masks it with safe generic message.
 * - Never returns any URL to user.
 */
export function sanitizeBackendError(raw: unknown, statusCode?: number): string {
  // 1. Timeouts
  if (isTimeoutError(raw) || statusCode === 408 || statusCode === 504) {
    return SERVER_TIMEOUT_MESSAGE;
  }

  // 2. Network / Connection failures (backend unreachable)
  if (isNetworkOrConnectionError(raw) || statusCode === 0) {
    return SERVER_UNAVAILABLE_MESSAGE;
  }

  // 3. Extract candidate message string
  let candidate = '';
  if (typeof raw === 'string') {
    candidate = raw.trim();
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.detail === 'string') {
      candidate = obj.detail.trim();
    } else if (Array.isArray(obj.detail) && obj.detail.length > 0) {
      // FastAPI / Pydantic validation errors
      const first = obj.detail[0];
      if (typeof first === 'string') {
        candidate = first.trim();
      } else if (first && typeof first === 'object' && typeof (first as any).msg === 'string') {
        candidate = (first as any).msg.trim();
      }
    } else if (typeof obj.message === 'string') {
      candidate = obj.message.trim();
    } else if (typeof obj.error === 'string') {
      candidate = obj.error.trim();
    }
  }

  if (candidate) {
    // If candidate has raw technical markers or URLs, sanitize it
    if (isRawTechnicalError(candidate)) {
      if (statusCode && statusCode >= 500) {
        return SERVER_UNAVAILABLE_MESSAGE;
      }
      if (statusCode === 404) {
        return 'The requested record or schedule was not found.';
      }
      if (statusCode === 401 || statusCode === 403) {
        return 'Session expired. Please solve captcha again.';
      }
      if (statusCode === 400 || statusCode === 422) {
        return 'Unable to process request with provided parameters. Please verify input.';
      }
      return SERVER_UNAVAILABLE_MESSAGE;
    }

    // Strip any accidental URLs that might be embedded in an otherwise human message
    const stripped = candidate.replace(/https?:\/\/[^\s)]+/gi, '').replace(/\s{2,}/g, ' ').trim();
    if (stripped.length > 0) {
      return stripped;
    }
  }

  // Fallbacks by status code
  if (statusCode && statusCode >= 500) {
    return SERVER_UNAVAILABLE_MESSAGE;
  }
  if (statusCode === 404) {
    return 'The requested record or schedule was not found.';
  }
  if (statusCode === 401 || statusCode === 403) {
    return 'Session expired. Please solve captcha again.';
  }

  return SERVER_UNAVAILABLE_MESSAGE;
}

/**
 * Normalizes any error (Error object, string, or unknown) into a clean user-safe message.
 * Safe for direct display in UI error banners, modals, and toasts.
 */
export function normalizeApiError(err: unknown, fallbackMessage = SERVER_UNAVAILABLE_MESSAGE): string {
  if (!err) return fallbackMessage;

  if (isTimeoutError(err)) {
    return SERVER_TIMEOUT_MESSAGE;
  }

  if (isNetworkOrConnectionError(err)) {
    return SERVER_UNAVAILABLE_MESSAGE;
  }

  const rawMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const sanitized = sanitizeBackendError(rawMsg);

  return sanitized || fallbackMessage;
}

/**
 * Helper to inspect and sanitize response bodies from non-ok Response objects.
 */
export async function extractResponseError(
  response: Response,
  defaultMessage?: string
): Promise<{ message: string; status: number }> {
  const status = response.status;

  if (status === 408 || status === 504) {
    return { message: SERVER_TIMEOUT_MESSAGE, status };
  }

  let rawDetail: unknown = null;
  try {
    const body = await response.json();
    rawDetail = body?.detail ?? body?.message ?? body?.error ?? null;
  } catch {
    // Non-JSON body (e.g. raw HTML 502 / proxy page)
  }

  const safeMsg = sanitizeBackendError(rawDetail, status);
  return {
    message: safeMsg || defaultMessage || SERVER_UNAVAILABLE_MESSAGE,
    status,
  };
}

/**
 * Parses and sanitizes an HTTP status + error response body into a clean user-safe string.
 */
export function parseHttpResponseError(
  status: number,
  errBody: unknown,
  defaultMessage?: string
): string {
  if (status === 408 || status === 504) {
    return SERVER_TIMEOUT_MESSAGE;
  }
  const safeMsg = sanitizeBackendError(errBody, status);
  return safeMsg || defaultMessage || SERVER_UNAVAILABLE_MESSAGE;
}

export const sanitizeApiErrorMessage = (msg: unknown, statusCode?: number): string =>
  sanitizeBackendError(msg, statusCode);


