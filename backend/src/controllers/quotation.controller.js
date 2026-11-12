import * as quotationService from '../services/quotation.service.js';
import { pdfFileName, renderBillingDocumentPdf } from '../services/pdf/billingDocumentPdf.js';
import { sendPdf } from '../utils/sendPdf.js';

export const list = async (req, res) => {
  res.json({ success: true, data: await quotationService.listQuotations(req.valid.query) });
};

export const getById = async (req, res) => {
  res.json({ success: true, data: await quotationService.getQuotation(req.valid.params.id) });
};

export const create = async (req, res) => {
  res.status(201).json({ success: true, data: await quotationService.createQuotation(req.valid.body) });
};

export const update = async (req, res) => {
  res.json({ success: true, data: await quotationService.updateQuotation(req.valid.params.id, req.valid.body) });
};

export const remove = async (req, res) => {
  await quotationService.deleteQuotation(req.valid.params.id);
  res.status(204).end();
};

export const pdf = async (req, res) => {
  const quotation = await quotationService.getQuotation(req.valid.params.id);
  const buffer = await renderBillingDocumentPdf(quotation, 'quotation');
  sendPdf(res, buffer, pdfFileName(quotation));
};
