/**
 * TypeScript interfaces and types for Indian Railways Chart Prepared & Vacant Berth Availability
 */

export interface ChartTrainRequest {
  train_number: string;
  journey_date: string; // YYYY-MM-DD
  boarding_station: string;
}

export interface ChartStatus {
  messageIndex?: number;
  chartOneFlag?: number;
  chartTwoFlag?: number;
  trainStartDate?: string;
  remoteStationCode?: string;
  messageType?: string;
}

export interface CoachSummary {
  coach_name: string;
  class_code: string;
  position_from_engine: number;
  vacant_berths: number;
}

export interface ChartTrainData {
  train_number: string;
  train_name: string;
  from: string;
  to: string;
  train_start_date: string;
  remote_location_chart_date?: string | null;
  remote: string;
  next_remote?: string | null;
  available_remote_for_booking?: string | null;
  destination_station?: string | null;
  chart_one_date?: string | null;
  chart_two_date?: string | null;
  chart_status?: ChartStatus | null;
  error?: string | null;
  coaches: CoachSummary[];
  source?: string;
}

export interface ChartTrainResponse {
  success: boolean;
  data: ChartTrainData | null;
  error?: string | null;
}

export interface ChartCoachRequest {
  train_number: string;
  journey_date: string; // YYYY-MM-DD
  boarding_station: string;
  remote_station: string;
  train_source_station: string;
  travel_class: string;
  coach: string;
}

export interface BerthSegment {
  split_no: number;
  from: string | null;
  to: string | null;
  quota: string | null;
  occupancy: boolean; // true = occupied for segment, false = vacant for segment
}

export interface SegmentSummary {
  split_no: number;
  from: string | null;
  to: string | null;
  quota: string | null;
}

export interface Berth {
  berth_no: number;
  berth_code: string | null; // L, M, U, SL, SU, etc.
  cabin_coupe: string | null;
  cabin_coupe_name_no: string | null;
  from: string | null;
  to: string | null;
  quota_count_station: string | number | null;
  enable: boolean;

  segments: BerthSegment[];
  occupied_segments: SegmentSummary[];
  vacant_segments: SegmentSummary[];

  total_segments: number;
  occupied_segment_count: number;
  vacant_segment_count: number;

  fully_occupied: boolean;
  partially_occupied: boolean;
  fully_vacant: boolean;
}

export interface BerthSummary {
  fully_occupied: number;
  partially_occupied: number;
  fully_vacant: number;
}

export interface ChartCoachData {
  train_number: string;
  journey_date: string;
  boarding_station: string;
  remote_station: string;
  train_source_station: string;
  class_code: string;
  coach: string;
  error?: string | null;
  berth_count: number;
  berth_summary: BerthSummary;
  berths: Berth[];
  source?: string;
}

export interface ChartCoachResponse {
  success: boolean;
  data: ChartCoachData | null;
  error?: string | null;
}

export type BerthFilterType = 'all' | 'occupied' | 'partially_occupied' | 'vacant';
export type BerthCodeType = 'all' | 'L' | 'M' | 'U' | 'SL' | 'SU' | 'CB' | 'CP' | 'other';

export interface RunningDays {
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
}

export interface ScheduleStation {
  code: string;
  name: string;
  station_code?: string;
  station_name?: string;
  arrival?: string | null;
  departure?: string | null;
  arrival_time?: string;
  departure_time?: string;
  route_number?: string | null;
  halt?: string | null;
  halt_time?: string;
  distance?: number | string | null;
  day?: number | string | null;
  serial?: number | string | null;
  boarding_disabled?: boolean;
  status?: string | null;
}

export interface TrainSchedule {
  train_number: string;
  train_name: string;
  from?: {
    code?: string | null;
    name?: string | null;
    station_code?: string;
    station_name?: string;
  };
  to?: {
    code?: string | null;
    name?: string | null;
    station_code?: string;
    station_name?: string;
  };
  origin?: {
    code?: string | null;
    name?: string | null;
    station_code?: string;
    station_name?: string;
  };
  destination?: {
    code?: string | null;
    name?: string | null;
    station_code?: string;
    station_name?: string;
  };
  train_owner?: string | null;
  running_days: RunningDays;
  stations: ScheduleStation[];
  source?: string;
  fetched_at?: number;
}

export interface TrainScheduleResponse {
  success: boolean;
  data: TrainSchedule | null;
  error?: string | null;
}
