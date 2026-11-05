import { describe, expect, it } from 'vitest'

import { itHoldsTextAtEveryLeaf } from '../../../shared/copy-leaves.test-support.js'
import { SORT_OPTIONS } from '../view-model/list.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  itHoldsTextAtEveryLeaf({ en: copy, cy })

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

  it('Should describe the results range the way the page always has', () => {
    expect(copy.results(26, 40, 40)).toBe('Showing 26-40 of 40')
  })

  it('Should carry the search and empty-state wording the fit specs pin', () => {
    expect(copy.title).toBe('Dashboard')
    expect(copy.search.label).toBe('Search by notification reference')
    expect(copy.search.noResults).toBe('No notifications found')
    expect(copy.empty).toEqual({
      text: 'There are no notifications yet.',
      startButton: 'Start a new notification'
    })
  })
})
