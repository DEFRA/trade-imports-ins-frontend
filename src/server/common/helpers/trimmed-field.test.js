import { describe, expect, it } from 'vitest'

import { trimmedField } from './trimmed-field.js'

const FIELD = 'name'
const VALUE = 'live-animals'
const NOTHING = ''

describe('trimmedField', () => {
  it('Should return a string field without its surrounding spaces', () => {
    expect(trimmedField({ [FIELD]: `  ${VALUE}  ` }, FIELD)).toBe(VALUE)
  })

  it('Should return an empty string for a field that is not a string', () => {
    expect(trimmedField({ [FIELD]: [VALUE] }, FIELD)).toBe(NOTHING)
  })

  it('Should return an empty string for a field the source lacks', () => {
    expect(trimmedField({}, FIELD)).toBe(NOTHING)
  })

  it('Should return an empty string when there is no source', () => {
    expect(trimmedField(undefined, FIELD)).toBe(NOTHING)
  })
})
