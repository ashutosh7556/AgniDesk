import { apiRequest } from './apiClient.js';

/** Fire safety service records (visits). Named to avoid clashing with "services/" as a folder name. */
const base = (id) => `/services/${encodeURIComponent(id)}`;

/** @returns {Promise<{ items, pagination, summary: { overdue, dueSoon, scheduled, completedThisMonth } }>} */
export const listServices = ({ search, customerId, status, serviceType, page, limit } = {}, signal) =>
  apiRequest('/services', { query: { search, customerId, status, serviceType, page, limit }, signal });

/** Reminders: overdue / due within `days`, plus scheduled visits. */
export const listReminders = (days = 30, signal) => apiRequest('/services/reminders', { query: { days }, signal });

export const getService = (id, signal) => apiRequest(base(id), { signal });
export const createService = (data) => apiRequest('/services', { method: 'POST', body: data });
export const updateService = (id, data) => apiRequest(base(id), { method: 'PUT', body: data });
export const completeService = (id) => apiRequest(`${base(id)}/complete`, { method: 'POST' });
export const deleteService = (id) => apiRequest(base(id), { method: 'DELETE' });
export const getCertificatePdf = (id) => apiRequest(`${base(id)}/certificate`, { responseType: 'blob' });
