import { describe, expect, it } from 'vitest'

import { countries } from './fixtures.js'

describe('#captured reference fixtures', () => {
  it('Should load the unfiltered countries as { code, name, subDivisions } entries beyond the SPS block', () => {
    expect(countries).toContainEqual({
      code: 'JE',
      name: 'Jersey',
      subDivisions: []
    })
  })

  it('Should leave United Kingdom out, as reference data does', () => {
    expect(countries.some(({ code }) => code === 'GB')).toBe(false)
  })
})
