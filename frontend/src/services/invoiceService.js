import { apiRequest } from './apiClient.js';

const base = (id) => `/invoices/${encodeURIComponent(id)}`;

/** @returns {Promise<{ items, pagination, summary }>} */
export const listInvoices = ({ search, customerId, invoiceType, paymentStatus, page, limit } = {}, signal) =>
  apiRequest('/invoices', { query: { search, customerId, invoiceType, paymentStatus, page, limit }, signal });

export const getInvoice = (id, signal) => apiRequest(base(id), { signal });
export const createInvoice = (data) => apiRequest('/invoices', { method: 'POST', body: data });
export const updateInvoice = (id, data) => apiRequest(base(id), { method: 'PUT', body: data });
export const cancelInvoice = (id) => apiRequest(`${base(id)}/cancel`, { method: 'POST' });
export const getInvoicePdf = (id) => apiRequest(`${base(id)}/pdf`, { responseType: 'blob' });

export const listInvoicePayments = (id, signal) => apiRequest(`${base(id)}/payments`, { signal });
/** data: { date, amount, mode, reference?, note? } */
export const recordPayment = (id, data) => apiRequest(`${base(id)}/payments`, { method: 'POST', body: data });
