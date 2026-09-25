import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../shared/copy-leaves.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const SAMPLE_ARGUMENTS = [1, 2, 3]

const textOf = (value) =>
  typeof value === 'function' ? value(...SAMPLE_ARGUMENTS) : value

describe('#copy', () => {
  it.each([
    ['en', copy],
    ['cy', cy]
  ])(
    'Should hold a non-empty string or copy function at every %s leaf',
    (locale, bundle) => {
      for (const { path, value } of leaves(bundle)) {
        expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
        expect(
          textOf(value).trim().length,
          `${locale}: ${path} must render text`
        ).toBeGreaterThan(0)
      }
    }
  )

  it('Should pin the English wording the controller tests and page rely on', () => {
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
