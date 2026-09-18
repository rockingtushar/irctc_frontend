/**
 * Station representation as returned by FastAPI /api/stations/all
 */
export interface Station {
  code: string;
  name: string;
}

/**
 * Normalized station object for lightning-fast, zero-overhead searching
 */
export interface NormalizedStation extends Station {
  normalizedCode: string;
  normalizedName: string;
}

/**
 * Payload parameters generated upon submitting the train search form
 */
export interface TrainSearchParams {
  fromCode: string;
  fromName: string;
  toCode: string;
  toName: string;
  date: string;
  travelClass?: string;
  quota?: string;
}

/**
 * Station cache structure saved into localStorage
 */
export interface StationCacheData {
  stations: Station[];
  timestamp: number;
  version?: string;
}

/**
 * Single day availability item inside a class
 */
export interface AvailabilityDay {
  date: string;
  status: string;
  reasonType?: string;
  reason?: string;
  availablityType?: string;
  currentBkgFlag?: string;
  waitListType?: string;
  [key: string]: unknown;
}

/**
 * Class availability breakdown for a single train class & quota
 */
export interface ClassAvailability {
  class: string;
  quota: string;
  days: AvailabilityDay[];
  totalFare?: number;
  baseFare?: number;
  [key: string]: unknown;
}

/**
 * Train model returned by /api/trains/search
 */
export interface Train {
  sNo?: number;
  trainNumber: string;
  trainName: string;
  fromStnCode: string;
  toStnCode: string;
  arrivalTime: string;
  departureTime: string;
  distance: number;
  duration: string;
  runningMon: string;
  runningTue: string;
  runningWed: string;
  runningThu: string;
  runningFri: string;
  runningSat: string;
  runningSun: string;
  avlClasses: string[];
  trainType: string[];
  journeyDate?: string;
  availability?: Record<string, ClassAvailability>;
  [key: string]: unknown;
}

/**
 * Request payload for /api/trains/search
 */
export interface TrainSearchRequestBody {
  session_id: string;
  captcha_answer: string | null;
  from_code: string;
  from_name: string;
  to_code: string;
  to_name: string;
  journey_date: string;
  travel_class?: string;
  quota?: string;
}

export interface CaptchaStartResponse {
  session_id: string;
  captcha_image_base64: string;
}

export interface CaptchaRefreshResponse {
  captcha_image_base64: string;
}

export interface TrainSearchResponse {
  trains: Train[];
}

/**
 * Request payload for /api/trains/availability
 */
export interface TrainAvailabilityRequestBody {
  session_id: string;
  train_number: string;
  from_code: string;
  to_code: string;
  journey_date: string;
  travel_class?: string;
  class_code?: string;
  quota: string;
  train_type?: string;
}

/**
 * Availability for one journey date
 */
export interface AvailabilityDayItem {
  date: string; // e.g., "2026-09-07"
  status: string; // e.g., "RLWL3/WL3", "AVAILABLE-0001"
  reasonType?: string;
  reason?: string;
  availabilityType?: number | string;
  currentBookingFlag?: string;
  waitListType?: number | string;
  [key: string]: unknown;
}

/**
 * Availability response for one
 * train + class + quota combination
 */
export interface TrainAvailabilityData {
  trainNumber: string;
  trainName?: string;
  class: string;
  quota: string;
  days: AvailabilityDayItem[];
  result?: unknown;
  raw?: unknown;
  totalFare?: number;
  baseFare?: number;
  fetchedAt?: string | number;
  [key: string]: unknown;
}

/**
 * State of availability for a single coach class
 */
export interface ClassState {
  isLoading: boolean;
  error: string | null;
  data: TrainAvailabilityData | null;
  fetchedAt?: string | number;
}

/**
 * Legacy interface for backward compatibility
 */
export interface TrainAvailabilityDay {
  availabilityDate: string;
  availabilityStatus: string;
}

/**
 * Legacy interface for backward compatibility
 */
export interface TrainAvailability {
  trainNo: string;
  trainName?: string;
  enqClass: string;
  quota: string;
  trainTypeCode?: string;
  from: string;
  to: string;
  avlDayList: TrainAvailabilityDay[];
  totalFare?: number;
  totalCollectibleAmount?: number;
  fetchedAt?: string | number;
}

/**
 * API response from /api/trains/availability
 */
export interface TrainAvailabilityResponse {
  availability?: TrainAvailability;
  trainNumber?: string;
  trainName?: string;
  class?: string;
  quota?: string;
  days?: AvailabilityDayItem[];
  totalFare?: number;
  baseFare?: number;
  fetchedAt?: string | number;
  result?: unknown;
  raw?: unknown;
}

export * from './runningStatus';

