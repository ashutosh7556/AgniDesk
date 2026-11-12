import { apiRequest } from './apiClient.js';

/** @returns {Promise<{ settings, options: { gstRates } }>} */
export const getSettings = (signal) => apiRequest('/settings', { signal });
export const updateSettings = (settings) => apiRequest('/settings', { method: 'PUT', body: settings });

export const updateProfile = (data) => apiRequest('/auth/profile', { method: 'PUT', body: data });
export const changePassword = (data) => apiRequest('/auth/password', { method: 'PUT', body: data });

/** Full backup as .xlsx (Blob). */
export const downloadBackup = () => apiRequest('/backup', { responseType: 'blob' });

/** Restores from a backup file. includeCustomers=false keeps the current Google Sheets customers. */
export const restoreBackup = (file, { includeCustomers }) =>
  apiRequest('/backup/restore', { method: 'POST', body: file, query: { customers: includeCustomers ? 'true' : 'false' } });
