import { describe, expect, it } from 'vitest'

import { itHoldsCopyAtEveryLeaf } from '../../../shared/copy-leaves.test-support.js'
import { SORT_OPTIONS } from '../view-model/list.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  itHoldsCopyAtEveryLeaf(copy, cy)

  it.each([
    ['en', copy],
    ['cy', cy]
  ])(
    'Should carry a %s label for every sort option, and no other',
    (_locale, bundle) => {
      expect(Object.keys(bundle.sort.options).toSorted()).toEqual(
        SORT_OPTIONS.map((option) => option.copyKey).toSorted()
      )
    }
  )

  it('Should word the results range as Showing {from}-{to} of {total}', () => {
    expect(copy.results(26, 40, 40)).toBe('Showing 26-40 of 40')
  })

  it('Should word the title, search label, no-results line, empty text and start button', () => {
    expect(copy.title).toBe('Dashboard')
    expect(copy.search.label).toBe('Search by notification reference')
    expect(copy.search.noResults).toBe('No notifications found')
    expect(copy.empty).toEqual({
      text: 'There are no notifications yet.',
      startButton: 'Start a new notification'
    })
  })
})
