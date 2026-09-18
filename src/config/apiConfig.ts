/**
 * Centralized API Configuration & Base URL Resolver
 * 
 * Production & Deployment Behavior:
 * 1. If VITE_API_URL or VITE_API_BASE_URL is set in environment (e.g. .env, Vercel, Docker, Cloud Run), it takes top priority.
 * 2. If the user overrides the URL via the in-app Settings modal, it is saved in localStorage ('rail_api_base_url').
 * 3. In production, if no external URL is configured, it cleanly falls back to the current origin or relative '/api'.
 * 4. In development/preview mode, it includes local dev proxy '/devtunnel-proxy' for CORS-free communication.
 */

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

  if (envUrl) {
    return envUrl;
  }

  // 3. Environment Fallbacks
  const isBrowser = typeof window !== 'undefined';
  const isDev = import.meta.env.DEV;

  if (isDev && isBrowser) {
    // Use Vite development proxy to avoid CORS in dev mode
    return '/devtunnel-proxy';
  }

  // In production, default to relative origin so same-origin / reverse-proxy deployments work out of the box
  if (isBrowser && window.location.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  return '';
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
  const base = getApiBaseUrl().replace(/\/$/, '');
  const candidates: string[] = [];

  // 1. Primary configured Base URL
  if (base) {
    candidates.push(`${base}${cleanPath}`);
  }

  // 2. If in dev mode or preview, include dev proxy as fallback candidate
  if (import.meta.env.DEV) {
    const proxyCandidate = `/devtunnel-proxy${cleanPath}`;
    if (!candidates.includes(proxyCandidate)) {
      candidates.push(proxyCandidate);
    }
  }

  // 3. Fallback direct relative path
  if (!candidates.includes(cleanPath)) {
    candidates.push(cleanPath);
  }

  return candidates;
}
