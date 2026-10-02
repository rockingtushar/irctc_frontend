/**
 * Centralized API Configuration & Base URL Resolver
 * 
 * Production & Deployment Behavior:
 * 1. If VITE_API_URL or VITE_API_BASE_URL is set in environment (e.g. .env, Vercel, Docker, Cloud Run), it takes top priority.
 * 2. If the user overrides the URL via the in-app Settings modal, it is saved in localStorage ('rail_api_base_url').
 * 3. In production, if no external URL is configured, it cleanly falls back to the current origin or relative '/api'.
 * 4. In development/preview mode, it includes local dev proxy '/devtunnel-proxy' for CORS-free communication.
 */

export const DEFAULT_BACKEND_URL = 'https://irctc-backend-1-ge8x.onrender.com';
export const RAILWAY_NTES_CLOUD_RUN_URL = 'https://railway-ntes-402829987485.asia-south1.run.app';
export const API_URL_STORAGE_KEY = 'rail_api_base_url';

/**
 * Returns the primary configured Base URL for API requests.
 */
export function getApiBaseUrl(): string {
  // 1. Check user-defined override from UI Settings (localStorage)
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(API_URL_STORAGE_KEY);
      if (saved && saved.trim()) {
        const cleanSaved = saved.trim().replace(/\/$/, '');
        const isHttps = window.location.protocol === 'https:';
        // Prevent mixed content errors in HTTPS preview if HTTP localhost was saved
        if (!(isHttps && cleanSaved.startsWith('http://localhost'))) {
          return cleanSaved;
        }
      }
    }
  } catch {
    // localStorage unavailable (e.g., SSR or incognito restrictions)
  }

  // 2. Check Environment Variables (VITE_API_URL or VITE_API_BASE_URL)
  const envUrl = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  ).trim().replace(/\/$/, '');

  if (envUrl && !envUrl.includes('127.0.0.1') && !envUrl.includes('localhost:8000')) {
    return envUrl;
  }

  // 3. Fallback to default production backend URL
  return DEFAULT_BACKEND_URL;
}

/**
 * Saves a custom API Base URL to localStorage (used by the UI settings modal).
 */
export function setApiBaseUrl(url: string): void {
  try {
    if (typeof window !== 'undefined') {
      if (url && url.trim()) {
        localStorage.setItem(API_URL_STORAGE_KEY, url.trim().replace(/\/$/, ''));
      } else {
        localStorage.removeItem(API_URL_STORAGE_KEY);
      }
    }
  } catch {
    // fallback
  }
}

/**
 * Returns a list of prioritized candidate URLs for a given endpoint path.
 * The fetcher iterates through these candidates to provide zero-friction failover.
 */
export function getCandidateApiUrls(endpointPath: string): string[] {
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const candidates: string[] = [];

  // 1. Direct relative path (works with Vite dev proxy and Vercel rewrites without CORS)
  candidates.push(cleanPath);

  // 2. Dedicated Railway NTES Cloud Run service (only for route & running status queries)
  const isNtesEndpoint =
    cleanPath.startsWith('/train/') ||
    cleanPath.startsWith('/trains/') ||
    cleanPath.startsWith('/api/trains/running-status') ||
    cleanPath.startsWith('/api/trains/route') ||
    cleanPath.startsWith('/test/');

  if (isNtesEndpoint && RAILWAY_NTES_CLOUD_RUN_URL) {
    const ntesUrl = `${RAILWAY_NTES_CLOUD_RUN_URL}${cleanPath}`;
    if (!candidates.includes(ntesUrl)) {
      candidates.push(ntesUrl);
    }
  }

  // 4. User-configured custom base URL from localStorage (if set)
  try {
    if (typeof window !== 'undefined') {
      const userCustomUrl = localStorage.getItem(API_URL_STORAGE_KEY);
      if (userCustomUrl && userCustomUrl.trim()) {
        const fullUrl = `${userCustomUrl.trim().replace(/\/$/, '')}${cleanPath}`;
        if (!candidates.includes(fullUrl)) {
          candidates.push(fullUrl);
        }
      }
    }
  } catch {
    // ignore
  }

  // 5. Default Render URL fallback (only on localhost or non-browser environment to prevent Disallowed CORS origin)
  if (DEFAULT_BACKEND_URL) {
    const isBrowser = typeof window !== 'undefined';
    const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (!isBrowser || isLocalhost) {
      const defaultUrl = `${DEFAULT_BACKEND_URL}${cleanPath}`;
      if (!candidates.includes(defaultUrl)) {
        candidates.push(defaultUrl);
      }
    }
  }

  return candidates;
}

/**
 * Standard user-facing messages for centralized error handling
 */
export const SERVER_UNAVAILABLE_MESSAGE = 'Server is temporarily unavailable. Please try again in a moment.';
export const SERVER_TIMEOUT_MESSAGE = 'Server is taking too long to respond. Please try again.';
export const SERVER_GENERIC_ERROR_MESSAGE = 'Unable to process request at this moment. Please try again.';

/**
 * Checks whether an error represents a network connection failure (server unreachable, DNS, offline, connection refused).
 */
export function isNetworkOrConnectionError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 0) {
    return true;
  }
  const str = (err instanceof Error ? `${err.name} ${err.message}` : String(err)).toLowerCase();
  return (
    str.includes('failed to fetch') ||
    str.includes('networkerror') ||
    str.includes('network error') ||
    str.includes('err_network') ||
    str.includes('err_connection') ||
    str.includes('econnrefused') ||
    str.includes('enotfound') ||
    str.includes('net::err') ||
    str.includes('load failed') ||
    str.includes('offline') ||
    str.includes('unreachable')
  );
}

/**
 * Checks whether an error represents a client or server request timeout.
 */
export function isTimeoutError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error && err.name === 'AbortError') {
    return true;
  }
  const str = (err instanceof Error ? `${err.name} ${err.message}` : String(err)).toLowerCase();
  return (
    str.includes('aborted') ||
    str.includes('timeout') ||
    str.includes('timed out') ||
    str.includes('etimedout') ||
    str.includes('err_timeout')
  );
}

/**
 * Checks whether an error message contains raw technical details, stack traces, URLs, or internal exceptions.
 */
export function isRawTechnicalMessage(str: string): boolean {
  if (!str) return false;

  // URLs (never expose URLs to users)
  if (/https?:\/\/[^\s"'<>]+/i.test(str)) return true;
  if (/\b(localhost|127\.0\.0\.1|0\.0\.0\.0):\d+/i.test(str)) return true;
  if (/\b[a-zA-Z0-9-]+\.(onrender\.com|run\.app|vercel\.app|herokuapp\.com)/i.test(str)) return true;

  // Stack traces & Python exceptions
  if (/traceback \(most recent call last\)/i.test(str)) return true;
  if (/file\s+["'].*["'],\s+line\s+\d+/i.test(str)) return true;
  if (/(KeyError|ValueError|TypeError|AttributeError|RuntimeError|HTTPException|JSONDecodeError|ZeroDivisionError|IndexError|NameError|ImportError|SyntaxError|ConnectionError|ConnectionRefusedError):\s*/i.test(str)) return true;

  // Database & internal backend infrastructure
  if (/(psycopg|sqlalchemy|postgres|OperationalError|IntegrityError|duplicate key value|pg_trgm)/i.test(str)) return true;
  if (/(upstream connect error|Cloud Run error|Cloudflare|502 Bad Gateway|503 Service Unavailable|504 Gateway Time-out|500 Internal Server Error)/i.test(str)) return true;
  if (/(<html|<!DOCTYPE|<body|<div)/i.test(str)) return true;

  return false;
}

/**
 * Strips URLs and sensitive server strings from any text.
 */
export function stripTechnicalDetails(str: string): string {
  if (!str) return '';
  return str
    .replace(/https?:\/\/[^\s"'<>]+/gi, '')
    .replace(/\b(localhost|127\.0\.0\.1|0\.0\.0\.0):\d+/gi, '')
    .replace(/\b[a-zA-Z0-9-]+\.(onrender\.com|run\.app|vercel\.app)/gi, '')
    .trim();
}

/**
 * Centralized error sanitization function.
 * Ensures user-facing error messages are clean, safe, and never expose backend URLs or stack traces.
 */
export function sanitizeApiErrorMessage(
  errorOrMessage: unknown,
  fallbackMessage = SERVER_GENERIC_ERROR_MESSAGE
): string {
  if (!errorOrMessage) {
    return fallbackMessage;
  }

  // 1. Timeout Check
  if (isTimeoutError(errorOrMessage)) {
    return SERVER_TIMEOUT_MESSAGE;
  }

  // 2. Network / Connection Unreachable Check
  if (isNetworkOrConnectionError(errorOrMessage)) {
    return SERVER_UNAVAILABLE_MESSAGE;
  }

  // 3. Extract raw string
  let rawStr = '';
  if (errorOrMessage instanceof Error) {
    rawStr = errorOrMessage.message;
  } else if (typeof errorOrMessage === 'string') {
    rawStr = errorOrMessage;
  } else if (typeof errorOrMessage === 'object' && errorOrMessage !== null) {
    const obj = errorOrMessage as Record<string, unknown>;
    if (typeof obj.detail === 'string') {
      rawStr = obj.detail;
    } else if (typeof obj.message === 'string') {
      rawStr = obj.message;
    } else if (typeof obj.error === 'string') {
      rawStr = obj.error;
    } else {
      rawStr = JSON.stringify(errorOrMessage);
    }
  } else {
    rawStr = String(errorOrMessage);
  }

  rawStr = rawStr.trim();

  // If raw string matches network or timeout text
  if (isNetworkOrConnectionError(rawStr)) {
    return SERVER_UNAVAILABLE_MESSAGE;
  }
  if (isTimeoutError(rawStr)) {
    return SERVER_TIMEOUT_MESSAGE;
  }

  // 4. Raw technical error or stack trace detected -> sanitize
  if (isRawTechnicalMessage(rawStr)) {
    // If it's a gateway or server failure, return server unavailable message
    if (/502|503|504|Bad Gateway|Service Unavailable|Gateway Time-out|ConnectionRefused/i.test(rawStr)) {
      return SERVER_UNAVAILABLE_MESSAGE;
    }
    return fallbackMessage;
  }

  // 5. Clean up any accidental URL residues
  const cleaned = stripTechnicalDetails(rawStr);
  if (!cleaned || cleaned.length < 3) {
    return fallbackMessage;
  }

  return cleaned;
}

/**
 * Backward-compatible alias for sanitizeApiErrorMessage
 */
export const sanitizeBackendError = (
  errorOrMessage: unknown,
  _status?: number,
  fallbackMessage?: string
): string => sanitizeApiErrorMessage(errorOrMessage, fallbackMessage);

export const normalizeApiError = (
  err: unknown,
  fallback?: string
): string => sanitizeApiErrorMessage(err, fallback);

/**
 * Centralized HTTP response error parser.
 * Safely parses response JSON body (checking detail, message, error) and applies sanitization.
 */
export function parseHttpResponseError(
  status: number,
  body: unknown,
  fallbackMessage?: string
): string {
  // 502 / 503 / 504 Gateway errors:
  if (status === 502 || status === 503 || status === 504) {
    // Check if body has a custom safe detail
    if (body && typeof body === 'object') {
      const detail = (body as Record<string, unknown>).detail;
      if (typeof detail === 'string' && detail.trim() && !isRawTechnicalMessage(detail)) {
        return detail.trim();
      }
    }
    return SERVER_UNAVAILABLE_MESSAGE;
  }

  // 408 Timeout:
  if (status === 408) {
    return SERVER_TIMEOUT_MESSAGE;
  }

  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;

    // FastAPI 422 validation error handling
    if (status === 422 && Array.isArray(obj.detail)) {
      const items = obj.detail as Array<{ loc?: string[]; msg?: string }>;
      const fieldMsgs = items
        .filter((d) => d && typeof d.msg === 'string')
        .map((d) => {
          const field = d.loc?.slice(-1)[0] || 'parameter';
          return `${field}: ${d.msg}`;
        });
      if (fieldMsgs.length > 0) {
        return `Validation Error: ${fieldMsgs.join(', ')}`;
      }
      return 'Invalid request parameters. Please verify your input.';
    }

    if (typeof obj.detail === 'string' && obj.detail.trim()) {
      return sanitizeApiErrorMessage(obj.detail, fallbackMessage);
    }
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return sanitizeApiErrorMessage(obj.message, fallbackMessage);
    }
    if (typeof obj.error === 'string' && obj.error.trim()) {
      return sanitizeApiErrorMessage(obj.error, fallbackMessage);
    }
  }

  if (typeof body === 'string' && body.trim()) {
    return sanitizeApiErrorMessage(body, fallbackMessage);
  }

  if (status === 500) {
    return fallbackMessage || SERVER_GENERIC_ERROR_MESSAGE;
  }

  return fallbackMessage || `Server returned HTTP ${status}. Please try again.`;
}
