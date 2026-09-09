import { Station } from '../types/station';
import { DEFAULT_MAJOR_STATIONS } from '../data/defaultStations';

export const API_URL_STORAGE_KEY = 'rail_api_base_url';

export function getApiBaseUrl(): string {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  try {
    const saved = localStorage.getItem(API_URL_STORAGE_KEY);
    if (saved && saved.trim()) {
      const cleanSaved = saved.trim().replace(/\/$/, '');
      if (isHttps && (cleanSaved.startsWith('http://localhost') || cleanSaved.startsWith('http://127.0.0.1') || cleanSaved.startsWith('http://'))) {
        // Ignored: mixed content blocked in https
      } else {
        return cleanSaved;
      }
    }
  } catch {
    // fallback
  }

  const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  if (envUrl) {
    if (isHttps && (envUrl.startsWith('http://localhost') || envUrl.startsWith('http://127.0.0.1') || envUrl.startsWith('http://'))) {
      // In HTTPS preview, fallback to the devtunnel HTTPS URL
      return 'http://89.116.122.159';
    }
    return envUrl;
  }

  return 'http://89.116.122.159';
}

export function setApiBaseUrl(url: string): void {
  try {
    localStorage.setItem(API_URL_STORAGE_KEY, url.trim().replace(/\/$/, ''));
  } catch {
    // fallback
  }
}

/**
 * Fetches the list of all railway stations (~13,000+) from the FastAPI backend.
 */
export async function fetchAllStations(customBaseUrl?: string): Promise<Station[]> {
  const baseUrl = (customBaseUrl || getApiBaseUrl()).replace(/\/$/, '');
  
  const candidateEndpoints = [
    `${baseUrl}/api/stations/all`,
    `${baseUrl}/api/stations`,
    `${baseUrl}/stations/all`,
    `${baseUrl}/stations`,
  ];

  let lastError: Error | null = null;

  for (const url of candidateEndpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        // 1. Direct array: [ { code: "NDLS", name: "NEW DELHI" }, ... ]
        if (Array.isArray(data) && data.length > 0) {
          const list = normalizeStationList(data);
          if (list.length > 0) return list;
        }

        // 2. Wrapped object: { stations: [...] } or { data: [...] }
        if (data && typeof data === 'object') {
          if (Array.isArray(data.stations) && data.stations.length > 0) {
            const list = normalizeStationList(data.stations);
            if (list.length > 0) return list;
          }
          if (Array.isArray(data.data) && data.data.length > 0) {
            const list = normalizeStationList(data.data);
            if (list.length > 0) return list;
          }
        }
      } else if (response.status !== 404) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText || 'Server error'}`);
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name !== 'AbortError' && !error.message.includes('aborted')) {
          lastError = error;
        }
      }
    }
  }

  // Friendly error message for cloud preview vs localhost
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isTargetHttp = baseUrl.startsWith('http://');

  if (isHttps && isTargetHttp) {
    throw new Error(
      `Cannot connect to "${baseUrl}" from HTTPS preview (browser blocks HTTP). Please paste your VS Code public HTTPS forwarded port URL.`
    );
  }

  if (lastError) {
    throw lastError;
  }

  // If backend endpoint was 404 or empty, return default stations gracefully
  return DEFAULT_MAJOR_STATIONS;
}

/**
 * Searches stations live on the FastAPI backend (/api/stations/search?q=...)
 */
export async function searchStationsApi(query: string, customBaseUrl?: string): Promise<Station[]> {
  if (!query || query.trim().length < 2) return [];
  const baseUrl = (customBaseUrl || getApiBaseUrl()).replace(/\/$/, '');
  const url = `${baseUrl}/api/stations/search?q=${encodeURIComponent(query.trim())}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return normalizeStationList(data);
      }
    }
  } catch (err) {
    console.warn('[searchStationsApi] Live search fallback failed:', err);
  }
  return [];
}

/**
 * Normalizes station objects from different API key conventions
 */
function normalizeStationList(rawList: any[]): Station[] {
  return rawList
    .map((item) => {
      const code = (item.code || item.station_code || item.stationCode || item.id || '').toString().trim().toUpperCase();
      const name = (item.name || item.station_name || item.stationName || item.station || '').toString().trim().toUpperCase();
      return { code, name };
    })
    .filter((station) => station.code.length > 0 && station.name.length > 0);
}
