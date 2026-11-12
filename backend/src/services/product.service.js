import { invoiceStore, productStore, stockMovementStore } from '../storage/stores.js';
import { ApiError } from '../utils/ApiError.js';
import { byNewest, matchesSearch, paginate } from '../utils/listing.js';
import { getStockHistory, getStockLevels } from './inventory.service.js';
import { scheduleSheetSync } from './sheetSync.service.js';

const SEARCH_FIELDS = ['id', 'name', 'category', 'hsnCode'];

/** A product is "low stock" when available quantity is at or below its alert level. */
export const isLowStock = (product) => product.quantity <= product.lowStockThreshold;

/**
 * API shape: `quantity` is the CALCULATED available stock;
 * `openingStock`, `adjustedQuantity` and `soldQuantity` explain how it was reached.
 */
const withStock = (product, level) => {
  const enriched = {
    ...product,
    quantity: level?.available ?? product.openingStock,
    adjustedQuantity: level?.adjusted ?? 0,
    soldQuantity: level?.sold ?? 0,
  };
  return { ...enriched, isLowStock: isLowStock(enriched) };
};

export async function listProducts({ search, page, limit, category, lowStock }) {
  const [products, levels] = await Promise.all([productStore.findAll(), getStockLevels()]);
  const all = products.map((p) => withStock(p, levels.get(p.id)));

  const filtered = all
    .filter((p) => matchesSearch(p, SEARCH_FIELDS, search))
    .filter((p) => !category || p.category === category)
    .filter((p) => !lowStock || p.isLowStock)
    .sort(byNewest);

  // Inventory-wide figures (independent of filters) for alerts and summary cards.
  const inStock = all.filter((p) => p.quantity > 0);
  const summary = {
    totalProducts: all.length,
    lowStockCount: all.filter((p) => p.isLowStock).length,
    totalUnits: Math.round(inStock.reduce((sum, p) => sum + p.quantity, 0) * 1000) / 1000,
    stockValue: Math.round(inStock.reduce((sum, p) => sum + p.quantity * p.purchasePrice, 0)),
  };

  return { ...paginate(filtered, { page, limit }), summary };
}

async function findProductOrThrow(id) {
  const product = await productStore.findById(id);
  if (!product) throw new ApiError(404, 'Product not found.');
  return product;
}

export async function getProduct(id) {
  const [product, levels] = await Promise.all([findProductOrThrow(id), getStockLevels()]);
  return withStock(product, levels.get(id));
}

export async function createProduct(data) {
  const created = await productStore.create(data);
  scheduleSheetSync('stock');
  return getProduct(created.id);
}

/** Updates details only; openingStock is not part of the update schema. */
export async function updateProduct(id, data) {
  const updated = await productStore.update(id, data);
  if (!updated) throw new ApiError(404, 'Product not found.');
  return getProduct(id);
}

/** Refused once the product appears on an invoice or has stock movements (keeps history intact). */
export async function deleteProduct(id) {
  await findProductOrThrow(id);
  const [invoices, movements] = await Promise.all([invoiceStore.findAll(), stockMovementStore.findAll()]);
  const usedOnInvoice = invoices.some((inv) => (inv.items ?? []).some((line) => line.productId === id));
  if (usedOnInvoice || movements.some((m) => m.productId === id)) {
    throw new ApiError(409, 'This product has sales or stock history and cannot be deleted.');
  }
  await productStore.delete(id);
}

export async function adjustStock(id, { date, type, quantity, note }) {
  const product = await findProductOrThrow(id);
  await stockMovementStore.create({ date, productId: id, productName: product.name, type, quantity, note });
  scheduleSheetSync('stock');
  return getProduct(id);
}

export async function productStockHistory(id) {
  const product = await findProductOrThrow(id);
  return getStockHistory(product);
}
