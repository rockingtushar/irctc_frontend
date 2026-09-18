/**
 * Centralized API service for Indian Railways PNR Status.
 * Interacts with FastAPI backend endpoints:
 *  - POST /api/pnr/session
 *  - POST /api/pnr/captcha  { session_id }
 *  - POST /api/pnr/captcha/refresh  { session_id }
 *  - POST /api/pnr/status  { pnr, captcha_answer, session_id }
 */

import { getApiBaseUrl, getCandidateApiUrls } from '../config/apiConfig';
import {
  PnrData,
  PnrResponse,
  PnrSessionResponse,
  PnrCaptchaResponse,
  PnrStatusRequestBody,
} from '../types/pnr';

export class PnrApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'PnrApiError';
    this.status = status;
  }
}

export class InvalidPnrCaptchaError extends PnrApiError {
  constructor(message = 'Incorrect CAPTCHA. Please try again.') {
    super(message, 400);
    this.name = 'InvalidPnrCaptchaError';
  }
}

export class PnrSessionExpiredError extends PnrApiError {
  constructor(message = 'PNR session has expired. A fresh session has been loaded.') {
    super(message, 401);
    this.name = 'PnrSessionExpiredError';
  }
}

let activeWorkingBaseUrl: string | null = null;

export function setWorkingBaseUrl(url: string): void {
  activeWorkingBaseUrl = url;
}

/**
 * Returns the resolved API base URL using active working endpoint or configured base URL
 */
export function getPnrApiBaseUrl(): string {
  if (activeWorkingBaseUrl) {
    return activeWorkingBaseUrl;
  }
  return getApiBaseUrl();
}

/**
 * Candidate URLs for PNR requests based on environment and proxy
 */
function getCandidateBaseUrls(): string[] {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const candidates: string[] = [];

  if (activeWorkingBaseUrl) {
    candidates.push(activeWorkingBaseUrl);
  }
  if (base) {
    candidates.push(base);
  }
  if (import.meta.env.DEV) {
    candidates.push('/devtunnel-proxy');
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    candidates.push(window.location.origin.replace(/\/$/, ''));
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

// ---------------------------------------------------------------------------
// PRELOAD & CACHE MANAGER: Ensures CAPTCHA is ready with ZERO wait time!
// ---------------------------------------------------------------------------
interface PreloadedCaptcha {
  sessionId: string;
  captchaImageUrl: string;
  timestamp: number;
}

let preloadedCaptchaPromise: Promise<PreloadedCaptcha | null> | null = null;
let cachedPreload: PreloadedCaptcha | null = null;

/**
 * Pre-fetches a fresh session and CAPTCHA in background ahead of time.
 */
export function preloadPnrCaptcha(): void {
  // If we already have a valid preloaded captcha under 2 minutes old, reuse it
  if (cachedPreload && Date.now() - cachedPreload.timestamp < 120000) {
    return;
  }
  if (preloadedCaptchaPromise) return;

  preloadedCaptchaPromise = (async () => {
    try {
      const sessionId = await createPnrSession();
      const captchaImageUrl = await getPnrCaptcha(sessionId);
      cachedPreload = {
        sessionId,
        captchaImageUrl,
        timestamp: Date.now(),
      };
      return cachedPreload;
    } catch (err) {
      console.warn('[pnrApi] Preload silent notice:', err);
      return null;
    } finally {
      preloadedCaptchaPromise = null;
    }
  })();
}

/**
 * Retrieves a warm preloaded CAPTCHA instantly, or fetches a new one if not ready.
 * Supports forceFresh to bypass cached preloads when retrying.
 */
export async function getFastPnrCaptcha(forceFresh = false): Promise<{ sessionId: string; captchaImageUrl: string }> {
  if (forceFresh) {
    cachedPreload = null;
    preloadedCaptchaPromise = null;
  }

  // 1. If valid cached preload exists (< 2 minutes old), return immediately
  if (!forceFresh && cachedPreload && Date.now() - cachedPreload.timestamp < 120000) {
    const result = {
      sessionId: cachedPreload.sessionId,
      captchaImageUrl: cachedPreload.captchaImageUrl,
    };
    cachedPreload = null; // consume
    // Schedule background preload for next search
    setTimeout(() => preloadPnrCaptcha(), 1500);
    return result;
  }

  // 2. If a preload is actively in flight, wait for it
  if (!forceFresh && preloadedCaptchaPromise) {
    try {
      const res = await preloadedCaptchaPromise;
      if (res) {
        cachedPreload = null;
        setTimeout(() => preloadPnrCaptcha(), 1500);
        return {
          sessionId: res.sessionId,
          captchaImageUrl: res.captchaImageUrl,
        };
      }
    } catch {
      // fallback to direct fetch below
    }
  }

  // 3. Fallback: create fresh session & captcha with automatic retry
  const sessionId = await createPnrSession();
  const captchaImageUrl = await getPnrCaptcha(sessionId);
  return { sessionId, captchaImageUrl };
}

/**
 * Helper to process CAPTCHA response whether it is binary image or JSON with base64
 */
async function processCaptchaResponse(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || '';

  // If response is direct binary image
  if (contentType.includes('image/')) {
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // If response is JSON
  if (contentType.includes('application/json')) {
    const json: PnrCaptchaResponse = await response.json();

    const candidate =
      json?.data?.image_base64 ||
      json?.image_base64 ||
      json?.data?.captcha ||
      (typeof json?.data === 'string' ? json.data : null);

    if (typeof candidate === 'string') {
      if (candidate.startsWith('data:image') || candidate.startsWith('<svg')) {
        return candidate;
      }
      const mime = json?.data?.content_type || json?.content_type || 'image/png';
      return `data:${mime};base64,${candidate}`;
    }

    if (json?.error || json?.detail) {
      throw new PnrApiError(json.error || json.detail || 'Failed to load CAPTCHA image', response.status);
    }
  }

  // Fallback: text or SVG
  const text = await response.text();
  if (text.startsWith('data:image') || text.startsWith('<svg')) {
    return text;
  }
  if (text.length > 50 && !text.includes('<html>')) {
    return `data:image/png;base64,${text.trim()}`;
  }

  throw new PnrApiError('Unable to parse CAPTCHA image from server.', 500);
}

function normalizeFetchError(err: unknown, timeoutMessage: string): Error {
  if (
    err instanceof PnrSessionExpiredError ||
    err instanceof InvalidPnrCaptchaError ||
    err instanceof PnrApiError
  ) {
    return err;
  }
  if (err instanceof Error) {
    const lower = (err.message || '').toLowerCase();
    if (err.name === 'AbortError' || lower.includes('abort') || lower.includes('timeout')) {
      return new PnrApiError(timeoutMessage, 408);
    }
    if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
      return new PnrApiError(
        'Backend IRCTC server is currently unreachable. Please check connection.',
        0
      );
    }
    return err;
  }
  return new Error(String(err));
}

/**
 * 1. Creates a new PNR session with fast auto-retry
 * POST /api/pnr/session
 */
export async function createPnrSession(attempt = 1): Promise<string> {
  const baseUrls = getCandidateBaseUrls();
  let lastError: Error | null = null;

  for (const baseUrl of baseUrls) {
    const url = `${baseUrl}/api/pnr/session`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const msg = errorData?.detail || errorData?.message || `Server returned HTTP ${response.status}`;
        lastError = new PnrApiError(msg, response.status);
        continue;
      }

      const data: PnrSessionResponse = await response.json();
      const extractedSessionId = data?.data?.session_id || data?.session_id;

      if (extractedSessionId) {
        activeWorkingBaseUrl = baseUrl;
        return extractedSessionId;
      }

      if (data && data.success === false) {
        throw new PnrApiError(data.error || data.detail || 'Unable to create PNR session.', 500);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      lastError = normalizeFetchError(
        err,
        'Connecting to Indian Railways timed out. Please click below to try again.'
      );
    }
  }

  // Automatic fast 1-time retry on failure
  if (attempt === 1) {
    await new Promise((r) => setTimeout(r, 300));
    return createPnrSession(2);
  }

  throw lastError || new PnrApiError('Unable to connect to Railway server. Please click Reload CAPTCHA.', 500);
}

/**
 * 2. Gets initial CAPTCHA image for the session with fast auto-retry
 * POST /api/pnr/captcha  { session_id: string }
 */
export async function getPnrCaptcha(sessionId: string, attempt = 1): Promise<string> {
  if (!sessionId) {
    throw new PnrApiError('Missing PNR session ID.', 400);
  }

  const baseUrls = getCandidateBaseUrls();
  let lastError: Error | null = null;

  for (const baseUrl of baseUrls) {
    const url = `${baseUrl}/api/pnr/captcha`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, image/*',
          'Content-Type': 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        body: JSON.stringify({ session_id: sessionId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401 || response.status === 403) {
        throw new PnrSessionExpiredError();
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const msg = errJson?.detail || errJson?.message;
        lastError = new PnrApiError(msg || 'Security CAPTCHA unavailable. Retrying...', response.status);
        continue;
      }

      const imgUrl = await processCaptchaResponse(response);
      activeWorkingBaseUrl = baseUrl;
      return imgUrl;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof PnrSessionExpiredError) {
        throw err;
      }
      lastError = normalizeFetchError(
        err,
        'Loading CAPTCHA timed out. Please click below to reload.'
      );
    }
  }

  if (attempt === 1) {
    await new Promise((r) => setTimeout(r, 300));
    return getPnrCaptcha(sessionId, 2);
  }

  throw lastError || new PnrApiError('Unable to load security CAPTCHA. Please refresh.', 500);
}

/**
 * 3. Refreshes CAPTCHA for an existing session with fast auto-retry
 * POST /api/pnr/captcha/refresh  { session_id: string }
 */
export async function refreshPnrCaptcha(sessionId: string, attempt = 1): Promise<string> {
  if (!sessionId) {
    throw new PnrApiError('Missing PNR session ID.', 400);
  }

  const baseUrls = getCandidateBaseUrls();
  let lastError: Error | null = null;

  for (const baseUrl of baseUrls) {
    const url = `${baseUrl}/api/pnr/captcha/refresh`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, image/*',
          'Content-Type': 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        body: JSON.stringify({ session_id: sessionId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401 || response.status === 403) {
        throw new PnrSessionExpiredError();
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const msg = errJson?.detail || errJson?.message;
        lastError = new PnrApiError(msg || 'Failed to refresh CAPTCHA.', response.status);
        continue;
      }

      const imgUrl = await processCaptchaResponse(response);
      activeWorkingBaseUrl = baseUrl;
      return imgUrl;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof PnrSessionExpiredError) {
        throw err;
      }
      lastError = normalizeFetchError(
        err,
        'Refreshing CAPTCHA timed out. Please click below to try again.'
      );
    }
  }

  if (attempt === 1) {
    await new Promise((r) => setTimeout(r, 300));
    return refreshPnrCaptcha(sessionId, 2);
  }

  throw lastError || new PnrApiError('Unable to refresh security CAPTCHA. Please try again.', 500);
}

/**
 * 4. Fetches real-time PNR Status with 90s IRCTC CRIS timeout
 * POST /api/pnr/status  { pnr, captcha_answer, session_id }
 */
export async function getPnrStatus(
  pnr: string,
  captchaAnswer: string,
  sessionId: string
): Promise<PnrData> {
  const cleanPnr = pnr.trim();
  const cleanCaptcha = captchaAnswer.trim();

  if (!/^\d{10}$/.test(cleanPnr)) {
    throw new PnrApiError('Please enter a valid 10-digit PNR number.', 400);
  }

  if (!cleanCaptcha) {
    throw new PnrApiError('Please enter the CAPTCHA.', 400);
  }

  if (!sessionId) {
    throw new PnrSessionExpiredError('PNR session expired. Please refresh and try again.');
  }

  const requestBody: PnrStatusRequestBody = {
    pnr: cleanPnr,
    captcha_answer: cleanCaptcha,
    session_id: sessionId,
  };

  const baseUrls = getCandidateBaseUrls();
  let lastError: Error | null = null;

  for (const baseUrl of baseUrls) {
    const url = `${baseUrl}/api/pnr/status`;
    const controller = new AbortController();
    // Extended 90-second timeout for IRCTC CRIS live server queries
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle specific error codes
      if (response.status === 401 || response.status === 403) {
        throw new PnrSessionExpiredError();
      }

      const jsonResult: PnrResponse = await response.json().catch(() => ({ success: false }));

      if (response.status === 400 || response.status === 422 || jsonResult.success === false) {
        const errorMsg =
          jsonResult.detail ||
          jsonResult.message ||
          jsonResult.error ||
          '';

        const lower = errorMsg.toLowerCase();
        if (
          lower.includes('not matched') ||
          lower.includes('captcha') ||
          lower.includes('invalid') ||
          lower.includes('incorrect')
        ) {
          throw new InvalidPnrCaptchaError(errorMsg || 'Incorrect CAPTCHA. Please try again.');
        }

        if (lower.includes('session') || lower.includes('expired')) {
          throw new PnrSessionExpiredError(errorMsg || 'Session expired. Please try again.');
        }

        if (lower.includes('pnr not found') || lower.includes('flushed') || lower.includes('invalid pnr')) {
          throw new PnrApiError(errorMsg || `PNR ${cleanPnr} not found or has been flushed from Indian Railways servers.`, 404);
        }

        if (errorMsg) {
          throw new PnrApiError(errorMsg, response.status || 400);
        }
      }

      if (!response.ok) {
        const msg = jsonResult.detail || jsonResult.message || `Server returned HTTP ${response.status}`;
        lastError = new PnrApiError(msg, response.status);
        continue;
      }

      if (jsonResult.success && jsonResult.data) {
        activeWorkingBaseUrl = baseUrl;
        return jsonResult.data;
      }

      if (jsonResult.data) {
        activeWorkingBaseUrl = baseUrl;
        return jsonResult.data;
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof InvalidPnrCaptchaError || err instanceof PnrSessionExpiredError) {
        throw err;
      }

      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || err.message.includes('aborted'));

      if (isAbort) {
        lastError = new PnrApiError(
          'PNR status request timed out. Indian Railways server is taking longer than usual. Please try again.',
          408
        );
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  if (lastError instanceof PnrApiError) {
    throw lastError;
  }

  if (lastError?.message?.includes('Failed to fetch') || lastError?.message?.includes('NetworkError')) {
    throw new PnrApiError(
      'Unable to connect to IRCTC server. Please check your connection and try again.',
      0
    );
  }

  throw lastError || new PnrApiError('Unable to fetch PNR status. Please try again.', 500);
}
