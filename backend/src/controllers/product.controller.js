import * as productService from '../services/product.service.js';

export const list = async (req, res) => {
  res.json({ success: true, data: await productService.listProducts(req.valid.query) });
};

export const getById = async (req, res) => {
  res.json({ success: true, data: await productService.getProduct(req.valid.params.id) });
};

export const create = async (req, res) => {
  res.status(201).json({ success: true, data: await productService.createProduct(req.valid.body) });
};

export const update = async (req, res) => {
  res.json({ success: true, data: await productService.updateProduct(req.valid.params.id, req.valid.body) });
};

export const remove = async (req, res) => {
  await productService.deleteProduct(req.valid.params.id);
  res.status(204).end();
};

export const adjustStock = async (req, res) => {
  res.status(201).json({ success: true, data: await productService.adjustStock(req.valid.params.id, req.valid.body) });
};

export const stockHistory = async (req, res) => {
  res.json({ success: true, data: await productService.productStockHistory(req.valid.params.id) });
};
