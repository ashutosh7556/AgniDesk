import { apiRequest } from './apiClient.js';
import { tokenStorage } from './tokenStorage.js';

/** @returns {Promise<{ settings, options: { gstRates } }>} */
export const getSettings = (signal) => apiRequest('/settings', { signal });
export const updateSettings = (settings) => apiRequest('/settings', { method: 'PUT', body: settings });

export const updateProfile = (data) => apiRequest('/auth/profile', { method: 'PUT', body: data });
/** Other devices are signed out; the server returns a fresh token so this device stays logged in. */
export async function changePassword(data) {
  const result = await apiRequest('/auth/password', { method: 'PUT', body: data });
  if (result?.token) tokenStorage.set(result.token);
  return result;
}

/** Full backup as .xlsx (Blob). */
export const downloadBackup = () => apiRequest('/backup', { responseType: 'blob' });

/** Restores from a backup file. includeCustomers=false keeps the current Google Sheets customers. */
export const restoreBackup = (file, { includeCustomers }) =>
  apiRequest('/backup/restore', { method: 'POST', body: file, query: { customers: includeCustomers ? 'true' : 'false' } });

/** Admin accounts (Settings > Users). */
export const listUsers = (signal) => apiRequest('/users', { signal });
export const createUser = (data) => apiRequest('/users', { method: 'POST', body: data });
export const resetUserPassword = (id, password) =>
  apiRequest(`/users/${encodeURIComponent(id)}/password`, { method: 'PUT', body: { password } });
export const deleteUser = (id) => apiRequest(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
