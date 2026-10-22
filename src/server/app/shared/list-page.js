const FIRST_PAGE = 1

export const parsePage = (queryPage) => {
  const page = Number.parseInt(queryPage, 10)
  return Number.isNaN(page) || page < FIRST_PAGE ? FIRST_PAGE : page
}

export const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const clampPage = (page, totalPages) =>
  Math.min(Math.max(page, FIRST_PAGE), Math.max(totalPages, FIRST_PAGE))

export const buildResultsLabel = (
  { page, pageSize, totalItems, totalPages },
  resultsLabelOf
) => {
  if (totalItems < 1) {
    return null
  }
  const currentPage = clampPage(page, totalPages)
  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)
  return resultsLabelOf(from, to, totalItems)
}

export const buildPaginationLinks = ({ page, totalPages }, pageHrefOf) => {
  if (totalPages <= 1) {
    return null
  }
  const currentPage = clampPage(page, totalPages)
  return {
    ...(currentPage > FIRST_PAGE && {
      previous: { href: pageHrefOf(currentPage - 1) }
    }),
    ...(currentPage < totalPages && {
      next: { href: pageHrefOf(currentPage + 1) }
    }),
    items: Array.from({ length: totalPages }, (_, index) => ({
      number: String(index + 1),
      href: pageHrefOf(index + 1),
      current: index + 1 === currentPage
    }))
  }
}
