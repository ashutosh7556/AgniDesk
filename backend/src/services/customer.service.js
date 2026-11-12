import { customerStore, invoiceStore, quotationStore, serviceStore } from '../storage/stores.js';
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
 * Hard delete, refused when the customer has quotations, invoices or service records so
 * business records never point at a missing customer.
 */
export async function deleteCustomer(id) {
  const [quotations, invoices, services] = await Promise.all([quotationStore.findAll(), invoiceStore.findAll(), serviceStore.findAll()]);
  const quotationCount = quotations.filter((q) => q.customerId === id).length;
  const invoiceCount = invoices.filter((inv) => inv.customerId === id).length;
  const serviceCount = services.filter((s) => s.customerId === id).length;
  if (quotationCount || invoiceCount || serviceCount) {
    throw new ApiError(
      409,
      `This customer has ${invoiceCount} invoice(s), ${quotationCount} quotation(s) and ${serviceCount} service record(s) and cannot be deleted.`,
    );
  }

  const deleted = await customerStore.delete(id);
  if (!deleted) throw new ApiError(404, 'Customer not found.');
}
