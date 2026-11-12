import * as invoiceService from '../services/invoice.service.js';
import * as paymentService from '../services/payment.service.js';
import { pdfFileName, renderBillingDocumentPdf } from '../services/pdf/billingDocumentPdf.js';
import { sendPdf } from '../utils/sendPdf.js';

export const list = async (req, res) => {
  res.json({ success: true, data: await invoiceService.listInvoices(req.valid.query) });
};

export const getById = async (req, res) => {
  res.json({ success: true, data: await invoiceService.getInvoice(req.valid.params.id) });
};

export const create = async (req, res) => {
  res.status(201).json({ success: true, data: await invoiceService.createInvoice(req.valid.body) });
};

export const update = async (req, res) => {
  res.json({ success: true, data: await invoiceService.updateInvoice(req.valid.params.id, req.valid.body) });
};

export const cancel = async (req, res) => {
  res.json({ success: true, data: await invoiceService.cancelInvoice(req.valid.params.id) });
};

export const listPayments = async (req, res) => {
  res.json({ success: true, data: await paymentService.listInvoicePayments(req.valid.params.id) });
};

export const recordPayment = async (req, res) => {
  res.status(201).json({ success: true, data: await paymentService.recordPayment(req.valid.params.id, req.valid.body) });
};

export const pdf = async (req, res) => {
  const invoice = await invoiceService.getInvoice(req.valid.params.id);
  const buffer = await renderBillingDocumentPdf(invoice, 'invoice');
  sendPdf(res, buffer, pdfFileName(invoice));
};
