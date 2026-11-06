const FIRST_PAGE = 1

export const parsePage = (queryPage) => {
  const page = Number.parseInt(queryPage, 10)
  return Number.isNaN(page) || page < FIRST_PAGE ? FIRST_PAGE : page
}

export const clampPage = (page, totalPages) =>
  Math.min(Math.max(page, FIRST_PAGE), Math.max(totalPages, FIRST_PAGE))

export const buildResultsLabel = (
  { page, pageSize, totalItems, totalPages },
  rangeLabelOf
) => {
  if (totalItems < 1) {
    return null
  }
  const currentPage = clampPage(page, totalPages)
  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)
  return rangeLabelOf(from, to, totalItems)
}

const shownPageNumbers = (currentPage, totalPages) => {
  const pagesEitherSideOfCurrent = 1
  const shown = [
    FIRST_PAGE,
    currentPage - pagesEitherSideOfCurrent,
    currentPage,
    currentPage + pagesEitherSideOfCurrent,
    totalPages
  ].filter((number) => number >= FIRST_PAGE && number <= totalPages)
  return [...new Set(shown)].sort((left, right) => left - right)
}

const pageItemsWithEllipses = (currentPage, totalPages, pageHrefOf) =>
  shownPageNumbers(currentPage, totalPages).flatMap((number, index, shown) => {
    const pageItem = {
      number: String(number),
      href: pageHrefOf(number),
      current: number === currentPage
    }
    const skipsPages = index > 0 && number - shown[index - 1] > 1
    return skipsPages ? [{ ellipsis: true }, pageItem] : [pageItem]
  })

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
    items: pageItemsWithEllipses(currentPage, totalPages, pageHrefOf)
  }
}
