import { apiRequest } from './apiClient.js';

/** @returns {Promise<{ items, pagination, summary }>} */
export const listProducts = ({ search, category, lowStock, page, limit } = {}, signal) =>
  apiRequest('/products', { query: { search, category, lowStock, page, limit }, signal });

export const getProduct = (id, signal) => apiRequest(`/products/${encodeURIComponent(id)}`, { signal });

export const createProduct = (data) => apiRequest('/products', { method: 'POST', body: data });

export const updateProduct = (id, data) =>
  apiRequest(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: data });

/** data: { date, type: 'purchase' | 'adjustment', quantity (+/-), note } */
export const adjustStock = (id, data) =>
  apiRequest(`/products/${encodeURIComponent(id)}/stock`, { method: 'POST', body: data });

export const getStockHistory = (id, signal) => apiRequest(`/products/${encodeURIComponent(id)}/stock`, { signal });

export const deleteProduct =(id) => apiRequest(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
