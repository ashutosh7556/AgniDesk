import { productStore } from '../storage/stores.js';
import { ApiError } from '../utils/ApiError.js';
import { byNewest, matchesSearch, paginate } from '../utils/listing.js';

const SEARCH_FIELDS = ['id', 'name', 'category'];

/** A product is "low stock" when quantity is at or below its alert level. */
export const isLowStock = (product) => product.quantity <= product.lowStockThreshold;

export async function listProducts({ search, page, limit, category, lowStock }) {
  const products = await productStore.findAll();

  const filtered = products
    .filter((p) => matchesSearch(p, SEARCH_FIELDS, search))
    .filter((p) => !category || p.category === category)
    .filter((p) => !lowStock || isLowStock(p))
    .sort(byNewest);

  const result = paginate(filtered.map(withStockFlag), { page, limit });

  // Inventory-wide figures (independent of filters) for alerts and summary cards.
  const summary = {
    totalProducts: products.length,
    lowStockCount: products.filter(isLowStock).length,
    totalUnits: products.reduce((sum, p) => sum + p.quantity, 0),
    stockValue: Math.round(products.reduce((sum, p) => sum + p.quantity * p.purchasePrice, 0)),
  };

  return { ...result, summary };
}

const withStockFlag = (product) => ({ ...product, isLowStock: isLowStock(product) });

export async function getProduct(id) {
  const product = await productStore.findById(id);
  if (!product) throw new ApiError(404, 'Product not found.');
  return withStockFlag(product);
}

export const createProduct = async (data) => withStockFlag(await productStore.create(data));

export async function updateProduct(id, data) {
  const product = await productStore.update(id, data);
  if (!product) throw new ApiError(404, 'Product not found.');
  return withStockFlag(product);
}

export async function deleteProduct(id) {
  const deleted = await productStore.delete(id);
  if (!deleted) throw new ApiError(404, 'Product not found.');
}
