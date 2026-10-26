// Paginated list shape from docs/api-convention.md: { items, pagination }
export const toPage = (items, { page, limit }, totalItems) => ({
  items,
  pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
});
