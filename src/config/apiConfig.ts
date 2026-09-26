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

  // 2. Dev proxy alias
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const devProxyPath = `/devtunnel-proxy${cleanPath}`;
    if (!candidates.includes(devProxyPath)) {
      candidates.push(devProxyPath);
    }
  }

  // 3. Configured Base URL (include if same-origin, localhost, or non-browser/SSR)
  const base = getApiBaseUrl().replace(/\/$/, '');
  if (base) {
    const isBrowser = typeof window !== 'undefined';
    const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isSameOrigin = isBrowser && window.location.origin === base;

    // Only append direct external backend URL when safe to prevent browser 'Disallowed CORS origin'
    if (!isBrowser || isSameOrigin || isLocalhost) {
      const fullUrl = `${base}${cleanPath}`;
      if (!candidates.includes(fullUrl)) {
        candidates.push(fullUrl);
      }
    }
  }

  // 4. Default Render URL (only if non-browser or matching origin)
  if (DEFAULT_BACKEND_URL && typeof window === 'undefined') {
    const defaultUrl = `${DEFAULT_BACKEND_URL}${cleanPath}`;
    if (!candidates.includes(defaultUrl)) {
      candidates.push(defaultUrl);
    }
  }

  return candidates;
}
