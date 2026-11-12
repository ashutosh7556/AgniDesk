import { customerStore } from '../storage/stores.js';
import { ApiError } from '../utils/ApiError.js';
import { byNewest, matchesSearch, paginate } from '../utils/listing.js';

const SEARCH_FIELDS = ['id', 'name', 'companyName', 'mobile', 'email', 'gstNumber'];

export async function listCustomers({ search, page, limit }) {
  const customers = await customerStore.findAll();
  const filtered = customers.filter((c) => matchesSearch(c, SEARCH_FIELDS, search)).sort(byNewest);
  return paginate(filtered, { page, limit });
}

export async function getCustomer(id) {
  const customer = await customerStore.findById(id);
  if (!customer) throw new ApiError(404, 'Customer not found.');
  return customer;
}

export const createCustomer = (data) => customerStore.create(data);

export async function updateCustomer(id, data) {
  const customer = await customerStore.update(id, data);
  if (!customer) throw new ApiError(404, 'Customer not found.');
  return customer;
}

/**
 * Hard delete. From Phase 3 this must refuse to delete customers that have
 * quotations or invoices, to keep business records consistent.
 */
export async function deleteCustomer(id) {
  const deleted = await customerStore.delete(id);
  if (!deleted) throw new ApiError(404, 'Customer not found.');
}
