import { apiRequest } from './apiClient.js';

const base = (id) => `/expenses/${encodeURIComponent(id)}`;

/** @returns {Promise<{ items, pagination, summary: { total, count, byCategory } }>} */
export const listExpenses = ({ search, category, from, to, page, limit } = {}, signal) =>
  apiRequest('/expenses', { query: { search, category, from, to, page, limit }, signal });

export const createExpense = (data) => apiRequest('/expenses', { method: 'POST', body: data });
export const updateExpense = (id, data) => apiRequest(base(id), { method: 'PUT', body: data });
export const deleteExpense = (id) => apiRequest(base(id), { method: 'DELETE' });
