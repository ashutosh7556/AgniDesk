/**
 * Thin fetch wrapper shared by all API services.
 * - Base URL comes from VITE_API_BASE_URL (empty in dev -> Vite proxy).
 * - Normalises the backend's { success, data | error } envelope.
 * - Phase 2 will attach the JWT Authorization header here.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class ApiRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiRequestError('Unable to reach the server.', 0);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    const message = payload?.error?.message ?? `Request failed (${response.status})`;
    throw new ApiRequestError(message, response.status);
  }
  return payload.data;
}
