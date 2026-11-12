import * as productService from '../services/product.service.js';

export const list = async (req, res) => {
  const data = await productService.listProducts(req.valid.query);
  res.json({ success: true, data });
};

export const getById = async (req, res) => {
  const product = await productService.getProduct(req.valid.params.id);
  res.json({ success: true, data: product });
};

export const create = async (req, res) => {
  const product = await productService.createProduct(req.valid.body);
  res.status(201).json({ success: true, data: product });
};

export const update = async (req, res) => {
  const product = await productService.updateProduct(req.valid.params.id, req.valid.body);
  res.json({ success: true, data: product });
};

export const remove = async (req, res) => {
  await productService.deleteProduct(req.valid.params.id);
  res.status(204).end();
};
