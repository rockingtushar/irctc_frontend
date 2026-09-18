/**
 * TypeScript definitions for Indian Railways PNR Status feature.
 * Matches the FastAPI backend PNR schema accurately.
 */

export interface Journey {
  date: string;
  train_number: string;
  train_name: string;
  source_station: string;
  destination_station: string;
  reservation_upto: string;
  boarding_point: string;
  journey_class: string;
  distance_km?: number | null;
  arrival_date?: string | null;
}

export interface PassengerBookingStatus {
  status: string;
  coach?: string | null;
  berth_number?: number | string | null;
  berth_code?: string | null;
  details?: string | null;
}

export interface PassengerCurrentStatus {
  status: string;
  coach?: string | null;
  berth_number?: number | string | null;
  berth_code?: string | null;
  details?: string | null;
}

export interface Passenger {
  passenger_number: number;
  booking: PassengerBookingStatus;
  current: PassengerCurrentStatus;
}

export interface GeneratedTimestamp {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
}

export interface PnrData {
  pnr: string;
  journey: Journey;
  passenger_count: number;
  passengers: Passenger[];
  status: string;
  chart_status?: string | null;
  quota?: string | null;
  booking_fare?: number | null;
  ticket_fare?: number | null;
  booking_date?: string | null;
  vikalp_status?: string | null;
  waitlist_type?: number | null;
  is_waitlisted?: boolean | null;
  information_messages?: string[];
  timestamp?: string | null;
  generated_timestamp?: GeneratedTimestamp | null;
}

export interface PnrResponse {
  success: boolean;
  data?: PnrData;
  error?: string;
  message?: string;
  detail?: string;
}

export interface PnrSessionData {
  session_id: string;
  expires_in?: number;
  captcha_required?: boolean;
}

export interface PnrSessionResponse {
  success: boolean;
  session_id?: string;
  data?: PnrSessionData;
  error?: string;
  detail?: string;
}

export interface PnrCaptchaData {
  session_id?: string;
  captcha_required?: boolean;
  content_type?: string;
  image_base64?: string;
  captcha?: string;
}

export interface PnrCaptchaResponse {
  success: boolean;
  data?: PnrCaptchaData;
  image_base64?: string;
  content_type?: string;
  error?: string;
  detail?: string;
}

export interface PnrStatusRequestBody {
  pnr: string;
  captcha_answer: string;
  session_id: string;
}
