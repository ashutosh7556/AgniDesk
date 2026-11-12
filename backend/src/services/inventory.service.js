import { invoiceStore, productStore, stockMovementStore } from '../storage/stores.js';

/**
 * Stock is DERIVED, never stored:
 *
 *   available = opening stock + Σ stock movements (purchases/adjustments) − Σ invoiced quantity
 *
 * Invoices are the record of sales, so creating, editing or cancelling an
 * invoice changes stock automatically without writing to products.xlsx.
 * This avoids multi-file writes that Excel storage cannot make atomic —
 * the numbers can never drift out of sync.
 */

const round3 = (value) => Math.round((value + Number.EPSILON) * 1000) / 1000;

const sumBy = (rows, getKey, getValue) => {
  const totals = new Map();
  for (const row of rows) {
    const key = getKey(row);
    if (key) totals.set(key, (totals.get(key) ?? 0) + getValue(row));
  }
  return totals;
};

/** Invoiced quantity per product (cancelled invoices excluded). */
export function soldQuantities(invoices) {
  const lines = invoices.filter((inv) => inv.status !== 'cancelled').flatMap((inv) => inv.items ?? []);
  return sumBy(lines, (line) => line.productId, (line) => line.quantity);
}

/** @returns {Promise<Map<string, {opening, adjusted, sold, available}>>} keyed by product id */
export async function getStockLevels() {
  const [products, movements, invoices] = await Promise.all([
    productStore.findAll(),
    stockMovementStore.findAll(),
    invoiceStore.findAll(),
  ]);
  const adjusted = sumBy(movements, (m) => m.productId, (m) => m.quantity);
  const sold = soldQuantities(invoices);

  return new Map(
    products.map((product) => {
      const level = {
        opening: product.openingStock,
        adjusted: round3(adjusted.get(product.id) ?? 0),
        sold: round3(sold.get(product.id) ?? 0),
      };
      level.available = round3(level.opening + level.adjusted - level.sold);
      return [product.id, level];
    }),
  );
}

/** Opening stock, purchases/adjustments and invoice sales for one product, oldest first. */
export async function getStockHistory(product) {
  const [movements, invoices] = await Promise.all([stockMovementStore.findAll(), invoiceStore.findAll()]);

  const entries = [
    {
      id: `${product.id}-opening`,
      date: product.createdAt.slice(0, 10),
      type: 'opening',
      quantity: product.openingStock,
      note: 'Opening stock',
      createdAt: product.createdAt,
    },
    ...movements
      .filter((m) => m.productId === product.id)
      .map((m) => ({ id: m.id, date: m.date, type: m.type, quantity: m.quantity, note: m.note, createdAt: m.createdAt })),
    ...invoices.flatMap((inv) =>
      (inv.items ?? [])
        .filter((line) => line.productId === product.id)
        .map((line, index) => ({
          id: `${inv.id}-${index}`,
          date: inv.date,
          type: inv.status === 'cancelled' ? 'sale-cancelled' : 'sale',
          // Cancelled sales are shown for reference but do not reduce stock.
          quantity: inv.status === 'cancelled' ? 0 : -line.quantity,
          note: `${inv.number} · ${inv.customerName}${inv.status === 'cancelled' ? ' (cancelled)' : ''}`,
          invoiceId: inv.id,
          createdAt: inv.createdAt,
        })),
    ),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));

  // Running balance after each entry
  let balance = 0;
  return entries.map((entry) => {
    balance = round3(balance + entry.quantity);
    return { ...entry, balance };
  });
}
