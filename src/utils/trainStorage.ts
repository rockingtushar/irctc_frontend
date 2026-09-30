import { TrainMasterItem } from '../types/train';

const RECENT_TRAINS_STORAGE_KEY = 'irctc_recent_trains_v1';
const MAX_RECENT_TRAINS = 5;

/**
 * Retrieves recently searched or selected trains from localStorage.
 */
export function getRecentTrains(): TrainMasterItem[] {
  try {
    const raw = localStorage.getItem(RECENT_TRAINS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Adds a train to recently selected list (Max 5, deduplicated by 5-digit number, placed at top).
 */
export function addRecentTrain(train: TrainMasterItem): TrainMasterItem[] {
  if (!train || !train.trainNumber) return getRecentTrains();
  try {
    const existing = getRecentTrains();
    const filtered = existing.filter(
      (t) => t.trainNumber.trim() !== train.trainNumber.trim()
    );
    const updated = [train, ...filtered].slice(0, MAX_RECENT_TRAINS);
    localStorage.setItem(RECENT_TRAINS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[trainStorage] Failed to save recent train:', err);
    return [];
  }
}

/**
 * Removes a specific train by train number from recents.
 */
export function removeRecentTrain(trainNumber: string): TrainMasterItem[] {
  try {
    const existing = getRecentTrains();
    const updated = existing.filter((t) => t.trainNumber.trim() !== trainNumber.trim());
    localStorage.setItem(RECENT_TRAINS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Clears all recent trains history.
 */
export function clearRecentTrains(): void {
  try {
    localStorage.removeItem(RECENT_TRAINS_STORAGE_KEY);
  } catch {
    // ignore
  }
}
