/**
 * TypeScript definitions for Train Running Status / Spot Your Train feature.
 * Matches backend POST /api/trains/running-status contract exactly.
 */

export interface RunningStatusStation {
  station_name: string;
  station_code: string;
  platform: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  scheduled_time: string | null;
  actual_time: string | null;
  delay_minutes: number | null;
  status: string | null;
  sequence: number;
  is_current: boolean;
  distance_km: number | null;
  is_stopping?: boolean;
  bookable?: boolean;
}

export interface RunningStatusEndpointInfo {
  station_code: string;
  station_name: string;
}

export interface RunningStatusCurrentStation {
  station_name: string;
  station_code: string;
  platform: string | null;
  sequence: number;
}

export interface CoachPosition {
  position: number;
  coach_type: string;
  coach_id: string;
}

export interface RunningStatusData {
  train_number: string;
  journey_date: string;
  train_name: string;
  status: string | null;
  current_station: RunningStatusCurrentStation | null;
  stations: RunningStatusStation[];
  coach_position?: CoachPosition[];
  source: string | RunningStatusEndpointInfo;
  destination?: string | RunningStatusEndpointInfo;
  station_count?: number;
  fetched_at: number;
}

export interface RunningStatusResponse {
  success: boolean;
  data: RunningStatusData;
  error?: string;
  detail?: string;
  message?: string;
}

export interface RunningStatusRequestBody {
  train_no: string;
  journey_date?: string; // Optional: "DD-MMM-YYYY", e.g. "14-Sep-2026"
}
