import { expenseStore } from '../storage/stores.js';
import { EXPENSE_CATEGORIES } from '../config/business.js';
import { ApiError } from '../utils/ApiError.js';
import { round2 } from '../utils/billing.js';
import { matchesSearch, paginate } from '../utils/listing.js';

const SEARCH_FIELDS = ['title', 'description', 'category'];

const byDateDesc = (a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

export async function listExpenses({ search, category, from, to, page, limit }) {
  const expenses = await expenseStore.findAll();
  const inRange = expenses.filter((e) => (!from || e.date >= from) && (!to || e.date <= to));
  const filtered = inRange
    .filter((e) => !category || e.category === category)
    .filter((e) => matchesSearch(e, SEARCH_FIELDS, search))
    .sort(byDateDesc);

  // Category breakdown for the date range (ignores the category filter so all categories stay visible).
  const byCategory = EXPENSE_CATEGORIES.map((name) => ({
    category: name,
    total: round2(inRange.filter((e) => e.category === name).reduce((sum, e) => sum + e.amount, 0)),
  }));

  const summary = {
    total: round2(filtered.reduce((sum, e) => sum + e.amount, 0)),
    count: filtered.length,
    byCategory,
  };
  return { ...paginate(filtered, { page, limit }), summary };
}

export async function getExpense(id) {
  const expense = await expenseStore.findById(id);
  if (!expense) throw new ApiError(404, 'Expense not found.');
  return expense;
}

export const createExpense = (data) => expenseStore.create(data);

export async function updateExpense(id, data) {
  const expense = await expenseStore.update(id, data);
  if (!expense) throw new ApiError(404, 'Expense not found.');
  return expense;
}

export async function deleteExpense(id) {
  const deleted = await expenseStore.delete(id);
  if (!deleted) throw new ApiError(404, 'Expense not found.');
}
