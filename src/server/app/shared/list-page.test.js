import { describe, expect, test } from 'vitest'

import {
  escapeHtml,
  paginationLinksOrNull,
  parsePage,
  resultsLabelOrNull
} from './list-page.js'

const lastOfTwoPages = { page: 2, pageSize: 25, totalItems: 30, totalPages: 2 }

const firstOfTwoPages = { ...lastOfTwoPages, page: 1 }

const rangeLabel = (from, to, count) => `Showing ${from}-${to} of ${count}`

const pageHrefOf = (page) => `/list?page=${page}`

const FIRST_PAGE_HREF = pageHrefOf(1)

const SECOND_PAGE_HREF = pageHrefOf(2)

describe('#parsePage', () => {
  test('Should read a page number from the query', () => {
    expect(parsePage('3')).toBe(3)
  })

  test.each([undefined, '', 'abc', '0', '-2'])(
    'Should fall back to page 1 for %s',
    (queryPage) => {
      expect(parsePage(queryPage)).toBe(1)
    }
  )
})

describe('#escapeHtml', () => {
  test('Should escape ampersands, angle brackets, double quotes and apostrophes', () => {
    expect(escapeHtml(`Tom & "Jerry" <Farm> O'Brien`)).toBe(
      'Tom &amp; &quot;Jerry&quot; &lt;Farm&gt; O&#39;Brien'
    )
  })
})

describe('#resultsLabelOrNull', () => {
  test.each([
    {
      range: '1-8 of 24 on a full first page',
      listPage: { page: 1, pageSize: 8, totalItems: 24, totalPages: 3 },
      expectedLabel: 'Showing 1-8 of 24'
    },
    {
      range: '26-30 of 30 on a partial last page',
      listPage: lastOfTwoPages,
      expectedLabel: 'Showing 26-30 of 30'
    }
  ])('Should label the range $range', ({ listPage, expectedLabel }) => {
    expect(resultsLabelOrNull(listPage, rangeLabel)).toBe(expectedLabel)
  })

  test('Should return null when there are no results', () => {
    expect(
      resultsLabelOrNull(
        { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
        rangeLabel
      )
    ).toBeNull()
  })
})

describe('#paginationLinksOrNull', () => {
  test('Should return numbered pages, marking the current one', () => {
    const pagination = paginationLinksOrNull(lastOfTwoPages, pageHrefOf)

    expect(pagination.items).toEqual([
      { number: '1', href: FIRST_PAGE_HREF, current: false },
      { number: '2', href: SECOND_PAGE_HREF, current: true }
    ])
  })

  test('Should return null for a single page', () => {
    expect(
      paginationLinksOrNull({ page: 1, totalPages: 1 }, pageHrefOf)
    ).toBeNull()
  })

  test('Should omit previous on the first page', () => {
    const firstPagePagination = paginationLinksOrNull(
      firstOfTwoPages,
      pageHrefOf
    )

    expect(firstPagePagination.previous).toBeUndefined()
  })

  test('Should link next to the second page on the first page', () => {
    const firstPagePagination = paginationLinksOrNull(
      firstOfTwoPages,
      pageHrefOf
    )

    expect(firstPagePagination.next.href).toBe(SECOND_PAGE_HREF)
  })

  test('Should link previous to the first page on the last page', () => {
    const lastPagePagination = paginationLinksOrNull(lastOfTwoPages, pageHrefOf)

    expect(lastPagePagination.previous.href).toBe(FIRST_PAGE_HREF)
  })

  test('Should omit next on the last page', () => {
    const lastPagePagination = paginationLinksOrNull(lastOfTwoPages, pageHrefOf)

    expect(lastPagePagination.next).toBeUndefined()
  })

  test('Should clamp a page past the end to the last page', () => {
    const pagination = paginationLinksOrNull(
      { ...lastOfTwoPages, page: 5 },
      pageHrefOf
    )

    expect(pagination.items[1].current).toBe(true)
    expect(pagination.previous.href).toBe(FIRST_PAGE_HREF)
    expect(pagination.next).toBeUndefined()
  })
})
