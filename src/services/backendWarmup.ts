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

import { getApiBaseUrl, getCandidateApiUrls, DEFAULT_BACKEND_URL } from '../config/apiConfig';
import { preloadPnrCaptcha } from './pnrApi';

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
 * Executes concurrent non-blocking warm-up pings across all candidate endpoints.
 */
export async function triggerBackendWarmup(force = false): Promise<WarmupState> {
  // If already awake in the last 4 minutes and not forced, return cached state
  if (
    !force &&
    warmupState.isAwake &&
    warmupState.lastChecked &&
    Date.now() - warmupState.lastChecked < 4 * 60 * 1000
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

  // Collect candidate URLs for health check / wake up
  const candidatePaths = ['/health', '/api/health', '/', '/api/stations/search?q=NDLS'];
  const candidateUrls: string[] = [];

  candidatePaths.forEach((path) => {
    const urls = getCandidateApiUrls(path);
    urls.forEach((u) => {
      if (!candidateUrls.includes(u)) {
        candidateUrls.push(u);
      }
    });
  });

  // Always ensure direct Render URL is included
  const directRender = `${DEFAULT_BACKEND_URL}/health`;
  if (!candidateUrls.includes(directRender)) {
    candidateUrls.push(directRender);
  }

  console.log('[BackendWarmup] Firing parallel Render wake-up pings to', candidateUrls.length, 'endpoints');

  // Fire parallel requests with 60-second abort controllers for Render cold-boot
  const pingPromises = candidateUrls.map(async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'X-Warmup-Ping': 'true',
        },
        signal: controller.signal,
        mode: url.startsWith('http') && !url.includes(window?.location?.hostname || '') ? 'cors' : 'cors',
      });

      clearTimeout(timeoutId);

      // Any HTTP status below 500 confirms the server container is online and awake
      if (response.status < 500) {
        return { success: true, url };
      }
      return { success: false, url };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      return { success: false, url, error: (err as Error)?.message };
    }
  });

  try {
    // Wait for the FIRST successful response from any endpoint
    const results = await Promise.all(pingPromises);
    const successful = results.find((r) => r.success);

    const duration = Date.now() - startTime;
    warmupState.isWarming = false;
    warmupState.lastChecked = Date.now();

    if (successful) {
      warmupState.isAwake = true;
      warmupState.latencyMs = duration;
      warmupState.endpoint = successful.url;
      console.log(`[BackendWarmup] Backend AWAKE & READY in ${duration}ms via ${successful.url}`);

      // Background proactive cache seeding: preload PNR CAPTCHA and station cache
      setTimeout(() => {
        try {
          preloadPnrCaptcha();
        } catch {
          // ignore
        }
      }, 1000);
    } else {
      warmupState.isAwake = false;
      warmupState.latencyMs = null;
      console.warn(`[BackendWarmup] All pings completed without active response (${duration}ms).`);
    }
  } catch (err) {
    warmupState.isWarming = false;
    warmupState.lastChecked = Date.now();
    console.warn('[BackendWarmup] Wake-up cycle error:', err);
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
