import { describe, expect, it } from 'vitest'

import { itHoldsCopyAtEveryLeaf } from '../../../shared/copy-leaves.test-support.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  itHoldsCopyAtEveryLeaf(copy, cy)

  it('Should word the title, form label, required-term error, returned count, failed reason, milliseconds and match line', () => {
    expect(copy.title).toBe('Address lookup spike')
    expect(copy.form.label).toBe('Postcode or address')
    expect(copy.errors.termRequired).toBe(
      'Enter a postcode or an address to search for'
    )
    expect(copy.search.returned(1, 3)).toBe('1 of 3 returned.')
    expect(copy.search.failed('HTTP_503')).toBe('Failed: HTTP_503')
    expect(copy.timings.milliseconds(700)).toBe('700ms')
    expect(copy.search.matchLine('1', 'EXACT', '100023336901')).toBe(
      'Match 1 (EXACT) · UPRN 100023336901'
    )
  })
})
