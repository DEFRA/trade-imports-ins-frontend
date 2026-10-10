import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../shared/copy-leaves.js'
import { NOTIFICATION_TYPES } from '../destinations.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  it.each([
    ['en', copy],
    ['cy', cy]
  ])('Should hold a non-empty string at every %s leaf', (locale, bundle) => {
    for (const { path, value } of leaves(bundle)) {
      expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
      expect(
        value.trim().length,
        `${locale}: ${path} must render text`
      ).toBeGreaterThan(0)
    }
  })

  it.each([
    ['en', copy],
    ['cy', cy]
  ])(
    'Should carry a %s label for every notification type, and no other',
    (_locale, bundle) => {
      expect(Object.keys(bundle.options).toSorted()).toEqual(
        NOTIFICATION_TYPES.map(({ copyKey }) => copyKey).toSorted()
      )
    }
  )

  it('Should carry the English wording the prototype and the specs pin', () => {
    expect(copy.title).toBe('What are you importing?')
    expect(copy.caption).toBe('About the consignment')
    expect(copy.options).toEqual({
      liveAnimals: 'Live animals',
      germinalProducts: 'Germinal products (semen, ova, embryos)',
      plantsForPlanting: 'Plants for planting',
      potatoes: 'Potatoes (seed and ware)',
      woodProducts: 'Wood products'
    })
    expect(copy.errors.notificationType).toBe('Select what you are importing')
    expect(copy.continue).toBe('Continue')
  })

  it('Should carry a Welsh counterpart for every string on the page', () => {
    expect(cy.title).toBe('Beth ydych chi’n ei fewnforio?')
    expect(cy.caption).toBe('Am y llwyth')
    expect(cy.options).toEqual({
      liveAnimals: 'Anifeiliaid byw',
      germinalProducts: 'Cynhyrchion germinol (semen, ofa, embryonau)',
      plantsForPlanting: 'Planhigion i’w plannu',
      potatoes: 'Tatws (hadyd a bwyta)',
      woodProducts: 'Cynhyrchion pren'
    })
    expect(cy.errors.notificationType).toBe(
      'Dewiswch beth rydych chi’n ei fewnforio'
    )
    expect(cy.continue).toBe('Parhau')
  })
})
