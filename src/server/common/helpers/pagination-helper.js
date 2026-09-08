/**
 * Shared pagination logic for list pages backed by different APIs whose
 * pagination metadata uses different field names for the same values (e.g.
 * address-book-helper.js's `pageSize`/`totalItems` vs
 * notification-dashboard-helper.js's `size`/`totalElements`). Callers pass
 * `sizeField`/`totalField` to name those properties on their own
 * `pagination` object, so the range-calculation and link-building logic
 * itself lives in one place.
 */

/** Clamps a requested page number into the valid [1, totalPages] range. */
export function normalizePageNumber(page, totalPages) {
  if (totalPages < 1) {
    return 1
  }
  return Math.min(Math.max(page, 1), totalPages)
}

/**
 * Builds a results range label for the current page, e.g. "Showing 1-25 of 40".
 * Returns null when there are no results.
 */
export function buildResultsLabel(pagination, { sizeField, totalField }) {
  const size = pagination[sizeField]
  const total = pagination[totalField]
  if (total < 1) {
    return null
  }

  const page = normalizePageNumber(pagination.page, pagination.totalPages || 1)
  const from = (page - 1) * size + 1
  const to = Math.min(page * size, total)

  return `Showing ${from}-${to} of ${total}`
}

/**
 * Builds numbered govukPagination previous/next/items links from pagination
 * metadata. `basePath` and `queryArgs` describe the caller's route and
 * current filters/sort; `buildQueryString` is the caller's own query-string
 * builder so each link's href round-trips that route's own state.
 */
export function buildPaginationLinks(
  pagination,
  { sizeField, totalField, basePath, queryArgs, buildQueryString }
) {
  const { totalPages } = pagination
  const size = pagination[sizeField]
  const total = pagination[totalField]
  const page = normalizePageNumber(pagination.page, totalPages)

  if (totalPages <= 1) {
    return null
  }

  const model = {
    results: {
      from: (page - 1) * size + 1,
      to: Math.min(page * size, total),
      count: total
    }
  }

  if (page > 1) {
    model.previous = {
      href: `${basePath}${buildQueryString({ ...queryArgs, page: page - 1 })}`
    }
  }

  if (page < totalPages) {
    model.next = {
      href: `${basePath}${buildQueryString({ ...queryArgs, page: page + 1 })}`
    }
  }

  model.items = Array.from({ length: totalPages }, (_, index) => {
    const number = index + 1
    return {
      number: String(number),
      href: `${basePath}${buildQueryString({ ...queryArgs, page: number })}`,
      current: number === page
    }
  })

  return model
}
