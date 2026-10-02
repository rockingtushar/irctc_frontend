import {
  getCandidateApiUrls,
  SERVER_UNAVAILABLE_MESSAGE,
  SERVER_TIMEOUT_MESSAGE,
  isNetworkOrConnectionError,
  isTimeoutError,
  sanitizeApiErrorMessage,
} from '../config/apiConfig';

export interface FeedbackRequestBody {
  message: string;
  rating?: number | null;
  category?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
}

export class FeedbackApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(sanitizeApiErrorMessage(message));
    this.name = 'FeedbackApiError';
    this.status = status;
  }
}

/**
 * Submits user feedback to backend POST /api/feedback
 */
export async function submitFeedback(payload: FeedbackRequestBody): Promise<FeedbackResponse> {
  const trimmedMessage = (payload.message || '').trim();

  // Client-side validations
  if (!trimmedMessage) {
    throw new FeedbackApiError('Please enter your feedback message.');
  }

  if (trimmedMessage.length < 3) {
    throw new FeedbackApiError('Feedback message must be at least 3 characters.');
  }

  if (trimmedMessage.length > 2000) {
    throw new FeedbackApiError('Feedback message cannot exceed 2000 characters.');
  }

  if (
    payload.rating !== undefined &&
    payload.rating !== null &&
    (payload.rating < 1 || payload.rating > 5)
  ) {
    throw new FeedbackApiError('Rating must be between 1 and 5.');
  }

  const cleanPayload: {
    message: string;
    rating?: number;
    category: string;
  } = {
    message: trimmedMessage,
    category: (payload.category || 'General Feedback').trim(),
  };

  if (typeof payload.rating === 'number' && payload.rating >= 1 && payload.rating <= 5) {
    cleanPayload.rating = payload.rating;
  }

  const candidateEndpoints = getCandidateApiUrls('/api/feedback');
  let lastError: Error | null = null;

  for (const url of candidateEndpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        body: JSON.stringify(cleanPayload),
      });

      if (!response.ok) {
        throw new FeedbackApiError('Unable to send feedback right now. Please try again.', response.status);
      }

      const data = await response.json().catch(() => null);

      return {
        success: Boolean(data?.success ?? true),
        message: data?.message || 'Thank you for your feedback!',
      };
    } catch (err: unknown) {
      if (isTimeoutError(err)) {
        lastError = new FeedbackApiError(SERVER_TIMEOUT_MESSAGE, 408);
      } else if (isNetworkOrConnectionError(err)) {
        lastError = new FeedbackApiError(SERVER_UNAVAILABLE_MESSAGE, 0);
      } else if (err instanceof FeedbackApiError) {
        lastError = err;
      } else {
        lastError = new FeedbackApiError(sanitizeApiErrorMessage(err, 'Unable to send feedback right now. Please try again.'));
      }
    }
  }

  throw lastError || new FeedbackApiError(SERVER_UNAVAILABLE_MESSAGE);
}
