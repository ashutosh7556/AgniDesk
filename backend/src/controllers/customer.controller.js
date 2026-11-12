import * as customerService from '../services/customer.service.js';

export const list = async (req, res) => {
  const data = await customerService.listCustomers(req.valid.query);
  res.json({ success: true, data });
};

export const getById = async (req, res) => {
  const customer = await customerService.getCustomer(req.valid.params.id);
  res.json({ success: true, data: customer });
};

export const create = async (req, res) => {
  const customer = await customerService.createCustomer(req.valid.body);
  res.status(201).json({ success: true, data: customer });
};

export const update = async (req, res) => {
  const customer = await customerService.updateCustomer(req.valid.params.id, req.valid.body);
  res.json({ success: true, data: customer });
};

export const remove = async (req, res) => {
  await customerService.deleteCustomer(req.valid.params.id);
  res.status(204).end();
};
