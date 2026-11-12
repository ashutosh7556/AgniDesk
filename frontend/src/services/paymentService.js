import { apiRequest } from './apiClient.js';

/** @returns {Promise<{ items, pagination, summary: { totalReceived, count } }>} */
export const listPayments = ({ search, mode, from, to, page, limit } = {}, signal) =>
  apiRequest('/payments', { query: { search, mode, from, to, page, limit }, signal });

export const deletePayment = (id) => apiRequest(`/payments/${encodeURIComponent(id)}`, { method: 'DELETE' });
