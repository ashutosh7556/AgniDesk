import { apiRequest } from './apiClient.js';

/** @returns {Promise<{ summary, salesOverview, inventory, recentActivity }>} */
export const getDashboard = (signal) => apiRequest('/dashboard', { signal });
