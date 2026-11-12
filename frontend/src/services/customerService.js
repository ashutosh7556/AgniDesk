import { apiRequest } from './apiClient.js';

/** @returns {Promise<{ items, pagination }>} */
export const listCustomers = ({ search, page, limit } = {}, signal) =>
  apiRequest('/customers', { query: { search, page, limit }, signal });

export const getCustomer = (id, signal) => apiRequest(`/customers/${encodeURIComponent(id)}`, { signal });

export const createCustomer = (data) => apiRequest('/customers', { method: 'POST', body: data });

export const updateCustomer = (id, data) =>
  apiRequest(`/customers/${encodeURIComponent(id)}`, { method: 'PUT', body: data });

export const deleteCustomer = (id) => apiRequest(`/customers/${encodeURIComponent(id)}`, { method: 'DELETE' });
