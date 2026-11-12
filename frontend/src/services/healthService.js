import { apiRequest } from './apiClient.js';

export const getHealth = (signal) => apiRequest('/health', { signal });
