/**
 * Types for Alternate Train Availability feature
 */

export interface AlternateAvailabilityRequest {
  session_id: string;
  train_number: string;
  from_code: string;
  to_code: string;
  journey_date: string; // YYYY-MM-DD
  travel_class: string; // e.g. "SL", "3A"
  quota?: string;       // e.g. "GN"
  train_type?: string | null;
  initial_status?: string | null;
}

export interface AlternateStartResponse {
  success: boolean;
  job_id: string;
  message?: string;
  [key: string]: unknown;
}

export interface AlternateResultItem {
  id?: string;
  trainNumber: string;
  trainName?: string;
  fromStationCode: string;
  fromStationName?: string;
  toStationCode: string;
  toStationName?: string;
  journeyDate?: string;
  class: string;
  quota?: string;
  status: string; // e.g. "AVAILABLE-0021", "AVAILABLE 5", "RAC 2"
  availableSeats?: number | string; // e.g. 21, 5
  ticketCount?: number;             // exact numeric seat count e.g. 21
  ticketStatusLabel?: string;        // e.g. "21 Tickets Available", "Confirmed (12 Seats)"
  totalFare?: number;
  baseFare?: number;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  distanceKm?: number;
  type?: string; // e.g. "same_train_different_station", "alternate_train", "break_journey"
  description?: string;
  bookingTip?: string;
  raw?: unknown;
}

export type AlternateSearchStatus = 'idle' | 'starting' | 'searching' | 'completed' | 'error' | 'cancelled';

export interface AlternateSearchProgress {
  checked: number;
  total: number;
  percent: number;
  remaining?: number;
  currentFrom?: string;
  currentTo?: string;
}

export interface AlternateSearchState {
  status: AlternateSearchStatus;
  jobId?: string;
  results: AlternateResultItem[];
  error?: string | null;
  startedAt: number;
  expiresAt: number;
  searchKey: string;
  progress?: AlternateSearchProgress;
}

export type AlternateStateListener = (state: AlternateSearchState) => void;
