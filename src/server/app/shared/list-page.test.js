import { describe, expect, test } from 'vitest'

import {
  escapeHtml,
  paginationLinksOrNull,
  parsePage,
  resultsLabelOrNull
} from './list-page.js'

const twoPages = { page: 2, pageSize: 25, totalItems: 30, totalPages: 2 }

const rangeLabel = (from, to, count) => `Showing ${from}-${to} of ${count}`

const pageHrefOf = (page) => `/list?page=${page}`

const FIRST_PAGE_HREF = pageHrefOf(1)

describe('#parsePage', () => {
  test('reads a page number from the query', () => {
    expect(parsePage('3')).toBe(3)
  })

  test.each([undefined, '', 'abc', '0', '-2'])(
    'falls back to page 1 for %s',
    (queryPage) => {
      expect(parsePage(queryPage)).toBe(1)
    }
  )
})

describe('#escapeHtml', () => {
  test('escapes ampersands, angle brackets, double quotes and apostrophes', () => {
    expect(escapeHtml(`Tom & "Jerry" <Farm> O'Brien`)).toBe(
      'Tom &amp; &quot;Jerry&quot; &lt;Farm&gt; O&#39;Brien'
    )
  })
})

describe('#resultsLabelOrNull', () => {
  test('formats the current page range', () => {
    expect(
      resultsLabelOrNull(
        { page: 1, pageSize: 8, totalItems: 24, totalPages: 3 },
        rangeLabel
      )
    ).toBe('Showing 1-8 of 24')
    expect(resultsLabelOrNull(twoPages, rangeLabel)).toBe('Showing 26-30 of 30')
  })

  test('returns null when there are no results', () => {
    expect(
      resultsLabelOrNull(
        { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
        rangeLabel
      )
    ).toBeNull()
  })
})

describe('#paginationLinksOrNull', () => {
  test('returns numbered pages, marking the current one', () => {
    const pagination = paginationLinksOrNull(twoPages, pageHrefOf)

    expect(pagination.items).toEqual([
      { number: '1', href: FIRST_PAGE_HREF, current: false },
      { number: '2', href: '/list?page=2', current: true }
    ])
    expect(pagination.previous.href).toBe(FIRST_PAGE_HREF)
  })

  test('returns null for a single page', () => {
    expect(
      paginationLinksOrNull({ page: 1, totalPages: 1 }, pageHrefOf)
    ).toBeNull()
  })

  test('omits previous on the first page and next on the last page', () => {
    const first = paginationLinksOrNull({ ...twoPages, page: 1 }, pageHrefOf)

    expect(first.previous).toBeUndefined()
    expect(first.next.href).toBe('/list?page=2')
    expect(paginationLinksOrNull(twoPages, pageHrefOf).next).toBeUndefined()
  })

  test('clamps a page past the end to the last page', () => {
    const pagination = paginationLinksOrNull(
      { ...twoPages, page: 5 },
      pageHrefOf
    )

    expect(pagination.items[1].current).toBe(true)
    expect(pagination.previous.href).toBe(FIRST_PAGE_HREF)
    expect(pagination.next).toBeUndefined()
  })
})
