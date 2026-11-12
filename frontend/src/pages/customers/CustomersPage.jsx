import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, Pencil, Plus, Trash2, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx';
import CustomerFormModal from '../../components/customers/CustomerFormModal.jsx';
import { deleteCustomer, listCustomers } from '../../services/customerService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useToast } from '../../hooks/useToast.js';

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  // { mode: 'create' } | { mode: 'edit', customer } | null
  const [formState, setFormState] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, isLoading, reload } = useFetch(
    (signal) => listCustomers({ search: debouncedSearch, page, limit: PAGE_SIZE }, signal),
    [debouncedSearch, page],
  );

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleSaved = () => {
    setFormState(null);
    reload();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCustomer(customerToDelete.id);
      toast.success(`${customerToDelete.name} deleted.`);
      setCustomerToDelete(null);
      // Step back a page if we just removed the last row on this page.
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const customers = data?.items ?? [];
  const total = data?.pagination.total ?? 0;

  const renderBody = () => {
    if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
    if (isLoading && !data) return <LoadingState label="Loading customers..." />;
    if (customers.length === 0) {
      return debouncedSearch ? (
        <EmptyState icon={Users} title="No matching customers" message={`Nothing found for "${debouncedSearch}".`} />
      ) : (
        <EmptyState
          icon={Users}
          title="No customers yet"
          message="Add your first customer to start creating quotations and invoices."
          action={
            <button type="button" className="btn-primary" onClick={() => setFormState({ mode: 'create' })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Customer
            </button>
          }
        />
      );
    }

    return (
      <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-3 sm:px-5">Customer</th>
              <th scope="col" className="px-3 py-3 sm:px-5">Mobile</th>
              <th scope="col" className="hidden px-3 py-3 sm:px-5 md:table-cell">Email</th>
              <th scope="col" className="hidden px-3 py-3 sm:px-5 lg:table-cell">GST Number</th>
              <th scope="col" className="px-3 py-3 sm:px-5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="cursor-pointer hover:bg-slate-50/70"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <td className="px-3 py-3 sm:px-5">
                  <p className="font-semibold text-slate-800">{customer.name}</p>
                  <p className="text-xs text-slate-500">{customer.companyName || customer.id}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-3 sm:px-5 tabular-nums text-slate-700">{customer.mobile}</td>
                <td className="hidden max-w-[220px] truncate px-3 py-3 sm:px-5 text-slate-600 md:table-cell">{customer.email || '—'}</td>
                <td className="hidden px-3 py-3 sm:px-5 font-mono text-xs text-slate-600 lg:table-cell">{customer.gstNumber || '—'}</td>
                <td className="px-3 py-3 sm:px-5">
                  {/* stopPropagation so action buttons don't also open the detail page */}
                  <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                    <Link to={`/customers/${customer.id}`} className="btn-icon" aria-label={`View ${customer.name}`} title="View">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button type="button" className="btn-icon" onClick={() => setFormState({ mode: 'edit', customer })} aria-label={`Edit ${customer.name}`} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn-icon hover:bg-fire-50! hover:text-fire-600!" onClick={() => setCustomerToDelete(customer)} aria-label={`Delete ${customer.name}`} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={data ? `${total} customer${total === 1 ? '' : 's'}` : 'Manage your customer records'}
        actions={
          <button type="button" className="btn-primary" onClick={() => setFormState({ mode: 'create' })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Customer
          </button>
        }
      />

      <div className="card min-w-0">
        <div className="border-b border-slate-100 p-4">
          <SearchInput value={search} onChange={handleSearchChange} placeholder="Search by name, company, mobile, email or GST" className="max-w-md" />
        </div>
        {renderBody()}
        <Pagination pagination={data?.pagination} onPageChange={setPage} itemLabel="customers" />
      </div>

      <CustomerFormModal
        isOpen={Boolean(formState)}
        customer={formState?.customer}
        onClose={() => setFormState(null)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        isOpen={Boolean(customerToDelete)}
        title="Delete customer?"
        message={
          customerToDelete && (
            <>
              <strong className="text-slate-800">{customerToDelete.name}</strong> will be permanently removed. This cannot be undone.
            </>
          )
        }
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
}
