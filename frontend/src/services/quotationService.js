import { apiRequest } from './apiClient.js';

const base = (id) => `/quotations/${encodeURIComponent(id)}`;

export const listQuotations = ({ search, customerId, page, limit } = {}, signal) =>
  apiRequest('/quotations', { query: { search, customerId, page, limit }, signal });

export const getQuotation = (id, signal) => apiRequest(base(id), { signal });
export const createQuotation = (data) => apiRequest('/quotations', { method: 'POST', body: data });
export const updateQuotation = (id, data) => apiRequest(base(id), { method: 'PUT', body: data });
export const deleteQuotation = (id) => apiRequest(base(id), { method: 'DELETE' });
export const getQuotationPdf = (id) => apiRequest(`${base(id)}/pdf`, { responseType: 'blob' });
