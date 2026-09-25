import { describe, expect, test } from 'vitest'

import { detectSearch, normalisePostcode } from './detect-search-mode.js'

const POSTCODE = 'SW1A 1AA'
const FREE_TEXT_ADDRESS = 'Buckingham Palace'

describe('#detectSearch', () => {
  test.each([POSTCODE, 'M1 1AA', 'B33 8TH', 'CR2 6XH', 'DN55 1PT', 'EC1A 1BB'])(
    'treats %s as a postcode',
    (term) => {
      expect(detectSearch(term).mode).toBe('POSTCODE')
    }
  )

  test.each([
    FREE_TEXT_ADDRESS,
    '10 Downing Street',
    'Downing Street, London',
    'SW1A',
    'London'
  ])('treats %s as free text', (term) => {
    expect(detectSearch(term).mode).toBe('FIND')
  })

  test('normalises a postcode that was typed without a space', () => {
    expect(detectSearch('sw1a1aa')).toEqual({
      mode: 'POSTCODE',
      term: POSTCODE
    })
  })

  test('normalises spacing and case', () => {
    expect(detectSearch('  sW1a   1aA ')).toEqual({
      mode: 'POSTCODE',
      term: POSTCODE
    })
  })

  test('trims free text but leaves it otherwise alone', () => {
    expect(detectSearch(`  ${FREE_TEXT_ADDRESS}  `)).toEqual({
      mode: 'FIND',
      term: FREE_TEXT_ADDRESS
    })
  })
})

describe('#normalisePostcode', () => {
  test('puts a single space before the last three characters', () => {
    expect(normalisePostcode('SW1A1AA')).toBe(POSTCODE)
    expect(normalisePostcode('m11aa')).toBe('M1 1AA')
  })
})
