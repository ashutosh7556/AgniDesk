/** Case-insensitive "contains" match across the given fields. */
export const matchesSearch = (record, fields, search) => {
  if (!search) return true;
  const needle = search.toLowerCase();
  return fields.some((field) => String(record[field] ?? '').toLowerCase().includes(needle));
};

/** Newest first, by createdAt (ISO strings sort lexically). */
export const byNewest = (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

export const paginate = (items, { page, limit }) => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    pagination: { page, limit, total, totalPages },
  };
};
