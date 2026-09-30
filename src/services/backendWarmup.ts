/**
 * Backend Warm-up & Keep-Alive Service for Render Free-Tier Hosting
 * 
 * Free-tier Render instances spin down (sleep) after 15 minutes of inactivity.
 * Cold start takes 25 to 50 seconds.
 * 
 * Strategy:
 * 1. Immediate Head Script: index.html dispatches non-blocking pings at HTML parsing time (0ms).
 * 2. Parallel Fast Warmup: Immediately fires concurrent health checks to all available endpoints.
 * 3. Proactive Cache Seeding: Once awake, automatically pre-seeds PNR CAPTCHA and station cache
 *    so by the time the user interacts, every response is instant!
 * 4. Active Keep-Alive: Pings every 10 minutes while tab is open to keep Render container hot.
 */

import { getCandidateApiUrls, DEFAULT_BACKEND_URL } from '../config/apiConfig';

export interface WarmupState {
  isWarming: boolean;
  isAwake: boolean;
  latencyMs: number | null;
  lastChecked: number | null;
  endpoint: string | null;
}

let warmupState: WarmupState = {
  isWarming: false,
  isAwake: false,
  latencyMs: null,
  lastChecked: null,
  endpoint: null,
};

let hasInitiated = false;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

type WarmupListener = (state: WarmupState) => void;
const listeners = new Set<WarmupListener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener({ ...warmupState });
    } catch {
      // ignore
    }
  });
}

export function subscribeWarmupStatus(listener: WarmupListener): () => void {
  listeners.add(listener);
  listener({ ...warmupState });
  return () => {
    listeners.delete(listener);
  };
}

export function getWarmupState(): WarmupState {
  return { ...warmupState };
}

/**
 * Executes a single, clean non-blocking health check to wake up the backend.
 * Uses sequential failover so only 1 request is sent if successful.
 */
export async function triggerBackendWarmup(force = false): Promise<WarmupState> {
  // If already awake in the last 5 minutes and not forced, return cached state
  if (
    !force &&
    warmupState.isAwake &&
    warmupState.lastChecked &&
    Date.now() - warmupState.lastChecked < 5 * 60 * 1000
  ) {
    return warmupState;
  }

  // Prevent duplicate concurrent wake-up cycles
  if (warmupState.isWarming && !force) {
    return warmupState;
  }

  warmupState.isWarming = true;
  notifyListeners();

  const startTime = Date.now();

  // Valid health endpoint is only /health
  const candidateUrls = getCandidateApiUrls('/health');
  if (DEFAULT_BACKEND_URL && !candidateUrls.includes(`${DEFAULT_BACKEND_URL}/health`)) {
    candidateUrls.push(`${DEFAULT_BACKEND_URL}/health`);
  }

  let isSuccessful = false;
  let successfulUrl = '';

  for (const url of candidateUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'X-Warmup-Ping': 'true',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || (response.status >= 200 && response.status < 400)) {
        isSuccessful = true;
        successfulUrl = url;
        break; // Stop immediately once awake
      }
    } catch {
      clearTimeout(timeoutId);
      // Try next candidate url if available
    }
  }

  const duration = Date.now() - startTime;
  warmupState.isWarming = false;
  warmupState.lastChecked = Date.now();

  if (isSuccessful) {
    warmupState.isAwake = true;
    warmupState.latencyMs = duration;
    warmupState.endpoint = successfulUrl;
  } else {
    warmupState.isAwake = false;
    warmupState.latencyMs = null;
  }

  notifyListeners();
  return warmupState;
}

/**
 * Initializes the backend warm-up service once per app session.
 * Automatically called on website open.
 */
export function initBackendWarmup(): void {
  if (typeof window === 'undefined') return;
  if (hasInitiated) return;
  hasInitiated = true;

  // 1. Instant parallel call on website open (non-blocking)
  triggerBackendWarmup().catch(() => {});

  // 2. Set up keep-alive ping every 10 minutes to prevent Render free-tier idle spin-down
  if (!keepAliveTimer) {
    keepAliveTimer = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        triggerBackendWarmup(true).catch(() => {});
      }
    }, 10 * 60 * 1000);
  }

  // 3. If user returns to tab after a long time, refresh ping
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const last = warmupState.lastChecked;
        if (!last || Date.now() - last > 8 * 60 * 1000) {
          triggerBackendWarmup(true).catch(() => {});
        }
      }
    });
  }
}
