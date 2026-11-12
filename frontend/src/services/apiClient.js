import { tokenStorage } from './tokenStorage.js';

/**
 * Thin fetch wrapper shared by all API services.
 * - Base URL comes from VITE_API_BASE_URL (empty in dev -> Vite proxy).
 * - Attaches the JWT as "Authorization: Bearer <token>".
 * - Normalises the backend's { success, data | error } envelope.
 * - On 401 for an authenticated request, clears the token and fires
 *   UNAUTHORIZED_EVENT so AuthContext can send the user to /login.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export const UNAUTHORIZED_EVENT = 'agnidesk:unauthorized';

export class ApiRequestError extends Error {
  constructor(message, status, details = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }

  /** Server validation details as { fieldName: message } for forms. */
  get fieldErrors() {
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

const buildUrl = (path, query) => {
  const url = `${BASE_URL}/api${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
};

/** responseType: 'json' (default) | 'blob' (e.g. PDF downloads). */
export async function apiRequest(path, { method = 'GET', body, query, signal, responseType = 'json' } = {}) {
  const token = tokenStorage.get();
  const headers = {};
  // Files (Blob/File) are sent as-is, everything else as JSON.
  const isFile = typeof Blob !== 'undefined' && body instanceof Blob;
  if (body !== undefined) headers['Content-Type'] = isFile ? 'application/octet-stream' : 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers,
      body: body === undefined ? undefined : isFile ? body : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiRequestError('Unable to reach the server. Check that the backend is running.', 0);
  }

  if (response.status === 204) return null;
  if (responseType === 'blob' && response.ok) return response.blob();

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    if (response.status === 401 && token) {
      tokenStorage.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiRequestError(
      payload?.error?.message ?? `Request failed (${response.status})`,
      response.status,
      payload?.error?.details ?? [],
    );
  }
  return payload.data;
}
