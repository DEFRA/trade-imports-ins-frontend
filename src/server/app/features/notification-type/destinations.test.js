import { beforeEach, describe, expect, test } from 'vitest'

import { config } from '../../../../config/config.js'
import { restoreConfigAfterEach } from '../../../common/test-helpers/restore-config-after-each.js'
import {
  NOTIFICATION_TYPES,
  returnUrlFor,
  startUrlFor,
  takesNotificationBack
} from './destinations.js'
import { expectedReturnUrl, handOversFor } from './hand-overs.test-support.js'

const ANIMALS_KEY = 'tradeImportsAnimalsFrontend.baseUrl'
const PLANTS_KEY = 'tradeImportsPlantsFrontend.baseUrl'
const ANIMALS_BASE_URL = 'http://animals.example.test'
const PLANTS_BASE_URL = 'http://plants.example.test'

const LIVE_ANIMALS = 'live-animals'

describe('notification types', () => {
  restoreConfigAfterEach([ANIMALS_KEY, PLANTS_KEY])

  beforeEach(() => {
    config.set(ANIMALS_KEY, ANIMALS_BASE_URL)
    config.set(PLANTS_KEY, PLANTS_BASE_URL)
  })

  test('are offered in the order the question shows them', () => {
    expect(NOTIFICATION_TYPES.map(({ value }) => value)).toEqual([
      LIVE_ANIMALS,
      'germinal-products',
      'plants-for-planting',
      'potatoes',
      'wood-products'
    ])
  })

  test.each(
    handOversFor({
      animalsBaseUrl: ANIMALS_BASE_URL,
      plantsBaseUrl: PLANTS_BASE_URL
    })
  )('hand %s over to %s', (value, startUrl) => {
    expect(startUrlFor(value)).toBe(startUrl)
  })

  test('take only a live animals notification back', () => {
    expect(
      NOTIFICATION_TYPES.filter(({ value }) =>
        takesNotificationBack(value)
      ).map(({ value }) => value)
    ).toEqual([LIVE_ANIMALS])
  })

  test('return a live animals notification to its origin page on the animals frontend', () => {
    expect(returnUrlFor(LIVE_ANIMALS, 'DRAFT.IMP.2026.1')).toBe(
      expectedReturnUrl({
        animalsBaseUrl: ANIMALS_BASE_URL,
        reference: 'DRAFT.IMP.2026.1'
      })
    )
  })

  test('do not double the slash when a configured base URL ends in one', () => {
    config.set(ANIMALS_KEY, `${ANIMALS_BASE_URL}/`)

    expect(startUrlFor(LIVE_ANIMALS)).toBe(
      `${ANIMALS_BASE_URL}/live-animals/start`
    )
  })
})
