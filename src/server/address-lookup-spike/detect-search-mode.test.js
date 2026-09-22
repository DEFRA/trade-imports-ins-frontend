import { describe, expect, test } from 'vitest'

import { detectSearch, normalisePostcode } from './detect-search-mode.js'

describe('#detectSearch', () => {
  test.each([
    'SW1A 1AA',
    'M1 1AA',
    'B33 8TH',
    'CR2 6XH',
    'DN55 1PT',
    'EC1A 1BB'
  ])('treats %s as a postcode', (term) => {
    expect(detectSearch(term).mode).toBe('POSTCODE')
  })

  test.each([
    'Buckingham Palace',
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
      term: 'SW1A 1AA'
    })
  })

  test('normalises spacing and case', () => {
    expect(detectSearch('  sW1a   1aA ')).toEqual({
      mode: 'POSTCODE',
      term: 'SW1A 1AA'
    })
  })

  test('trims free text but leaves it otherwise alone', () => {
    expect(detectSearch('  Buckingham Palace  ')).toEqual({
      mode: 'FIND',
      term: 'Buckingham Palace'
    })
  })
})

describe('#normalisePostcode', () => {
  test('puts a single space before the last three characters', () => {
    expect(normalisePostcode('SW1A1AA')).toBe('SW1A 1AA')
    expect(normalisePostcode('m11aa')).toBe('M1 1AA')
  })
})
