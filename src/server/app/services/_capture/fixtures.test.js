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

  it('Should hold every country reference data serves unfiltered, in its order', () => {
    expect(countries).toHaveLength(249)
    expect(countries[0]).toEqual({
      code: 'AF',
      name: 'Afghanistan',
      subDivisions: []
    })
    expect(countries[1].name).toBe('Aland Islands')
  })
})
