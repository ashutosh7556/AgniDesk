import { Plus, Trash2 } from 'lucide-react';

let counter = 0;
export const createEquipmentRow = (overrides = {}) => ({ key: `eq-${Date.now()}-${counter++}`, name: '', quantity: '1', details: '', ...overrides });

const inputClass = (hasError) =>
  `block w-full rounded-md border bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 ${
    hasError ? 'border-fire-500 focus:ring-fire-100' : 'border-slate-300 focus:border-flame-500 focus:ring-flame-100'
  }`;

/** Editable equipment list for a service visit. errors keyed "equipment.0.name". */
export default function EquipmentEditor({ rows, onChange, errors = {} }) {
  const update = (index, field, value) => onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="text-sm text-slate-500">No equipment added. Add the extinguishers, hydrants or alarms covered by this visit.</p>}
      {rows.map((row, index) => {
        const err = (field) => errors[`equipment.${index}.${field}`];
        return (
          <div key={row.key} className="grid grid-cols-[1fr_80px_36px] gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-[minmax(0,1.2fr)_80px_minmax(0,1fr)_36px]">
            <div>
              <label htmlFor={`${row.key}-name`} className="mb-1 block text-xs font-medium text-slate-500">Equipment</label>
              <input id={`${row.key}-name`} value={row.name} onChange={(e) => update(index, 'name', e.target.value)} placeholder="e.g. ABC Powder Extinguisher 6kg" maxLength={150} className={inputClass(err('name'))} />
              {err('name') && <p className="mt-1 text-xs text-fire-600">{err('name')}</p>}
            </div>
            <div>
              <label htmlFor={`${row.key}-qty`} className="mb-1 block text-xs font-medium text-slate-500">Qty</label>
              <input id={`${row.key}-qty`} type="number" min="1" step="1" inputMode="numeric" value={row.quantity} onChange={(e) => update(index, 'quantity', e.target.value)} className={`${inputClass(err('quantity'))} text-right`} />
              {err('quantity') && <p className="mt-1 text-xs text-fire-600">{err('quantity')}</p>}
            </div>
            <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
              <label htmlFor={`${row.key}-details`} className="mb-1 block text-xs font-medium text-slate-500">Details</label>
              <input id={`${row.key}-details`} value={row.details} onChange={(e) => update(index, 'details', e.target.value)} placeholder="Capacity, serial no., location" maxLength={300} className={inputClass(false)} />
            </div>
            <button type="button" onClick={() => onChange(rows.filter((_, i) => i !== index))} className="btn-icon mt-5 hover:bg-fire-50! hover:text-fire-600!" aria-label={`Remove equipment ${index + 1}`} title="Remove">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}
      <button type="button" className="btn-secondary" onClick={() => onChange([...rows, createEquipmentRow()])}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add equipment
      </button>
    </div>
  );
}
