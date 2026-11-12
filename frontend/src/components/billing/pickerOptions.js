import { listCustomers } from '../../services/customerService.js';
import { listProducts } from '../../services/productService.js';
import { formatCurrency } from '../../utils/format.js';

/** Option shape used by SearchSelect for customers. */
export const toCustomerOption = (customer) => ({
  value: customer.id,
  label: customer.name,
  description: [customer.companyName, customer.mobile, customer.gstNumber && `GSTIN ${customer.gstNumber}`]
    .filter(Boolean)
    .join(' · '),
  data: customer,
});

export const fetchCustomerOptions = async (search, signal) => {
  const { items } = await listCustomers({ search, limit: 20 }, signal);
  return items.map(toCustomerOption);
};

export const fetchProductOptions = async (search, signal) => {
  const { items } = await listProducts({ search, limit: 20 }, signal);
  return items.map((product) => ({
    value: product.id,
    label: product.name,
    description: `${formatCurrency(product.sellingPrice)} · GST ${product.gstRate}% · ${product.quantity} in stock`,
    data: product,
  }));
};
