import { useId, useState } from 'react';
import { AlertCircle, Loader2, Search, X } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';

/**
 * Searchable picker backed by an API search (customers, products...).
 *
 * fetchOptions(search, signal) -> Promise<[{ value, label, description?, data }]>
 * selected: the currently selected option (or null) — shown as a chip with a clear button.
 * Set `keepOpenAfterSelect` style pickers (e.g. "add product") by passing selected={null}.
 */
export default function SearchSelect({
  label,
  name,
  selected,
  onSelect,
  onClear,
  fetchOptions,
  placeholder = 'Search...',
  error,
  required,
  disabled,
  emptyText = 'No matches found.',
  className = '',
}) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debouncedQuery = useDebouncedValue(query, 250);

  const { data, isLoading } = useFetch(
    async (signal) => (isOpen ? { query: debouncedQuery, options: await fetchOptions(debouncedQuery, signal) } : null),
    [isOpen, debouncedQuery],
  );
  // Only show results that belong to what is typed right now; otherwise a fast
  // click/Enter could pick a result from the previous search.
  const isSearching = isLoading || query !== debouncedQuery || data?.query !== query;
  const options = isSearching ? [] : data.options;

  const choose = (option) => {
    onSelect(option);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter') {
      if (isOpen && options[highlight]) {
        event.preventDefault();
        choose(options[highlight]);
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const inputId = `field-${name}`;
  const controlBorder = error ? 'border-fire-500 focus-within:ring-fire-100' : 'border-slate-300 focus-within:border-flame-500 focus-within:ring-flame-100';

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-fire-600" aria-hidden="true">*</span>}
        </label>
      )}

      {selected ? (
        <div className={`flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-3 py-2 ${controlBorder}`}>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{selected.label}</p>
            {selected.description && <p className="truncate text-xs text-slate-500">{selected.description}</p>}
          </div>
          {!disabled && (
            <button type="button" onClick={onClear} className="btn-icon shrink-0" aria-label={`Clear ${label ?? 'selection'}`}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className={`relative rounded-lg border bg-white transition focus-within:ring-2 ${controlBorder}`}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id={inputId}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${inputId}-error` : undefined}
              autoComplete="off"
              disabled={disabled}
              value={query}
              placeholder={placeholder}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlight(0);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setIsOpen(false)}
              onKeyDown={handleKeyDown}
              className="block w-full rounded-lg bg-transparent py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {isSearching && isOpen && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" aria-hidden="true" />
            )}
          </div>

          {isOpen && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              {options.length === 0 ? (
                <li className="px-3 py-3 text-sm text-slate-500">{isSearching ? 'Searching...' : emptyText}</li>
              ) : (
                options.map((option, index) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={index === highlight}
                    // mousedown (not click) fires before the input's blur closes the list
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(option);
                    }}
                    onMouseEnter={() => setHighlight(index)}
                    className={`cursor-pointer px-3 py-2 ${index === highlight ? 'bg-flame-50' : ''}`}
                  >
                    <p className="text-sm font-medium text-slate-800">{option.label}</p>
                    {option.description && <p className="text-xs text-slate-500">{option.description}</p>}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-fire-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
