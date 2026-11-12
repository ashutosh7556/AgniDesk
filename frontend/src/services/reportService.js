import { apiRequest } from './apiClient.js';

/** Report keys must match backend REPORTS in services/report.service.js. */
export const getReport = (type, { from, to }, signal) => apiRequest(`/reports/${type}`, { query: { from, to }, signal });

export const exportReport = (type, { from, to }) =>
  apiRequest(`/reports/${type}/export`, { query: { from, to }, responseType: 'blob' });
