import { afterEach, describe, expect, test, vi } from 'vitest'

const configState = vi.hoisted(() => {
  const defaults = {
    animals: 'http://localhost:3000',
    plants: 'http://localhost:3003'
  }
  return { defaults, ...defaults }
})

vi.mock('../../../../config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'tradeImportsAnimalsFrontend.baseUrl') {
        return configState.animals
      }
      if (key === 'tradeImportsPlantsFrontend.baseUrl') {
        return configState.plants
      }
      return undefined
    })
  }
}))

const { NOTIFICATION_TYPES, startUrlFor } = await import('./destinations.js')

const LIVE_ANIMALS = 'live-animals'
const POTATOES = 'potatoes'
const ANIMALS_START = 'http://localhost:3000/live-animals/start'
const PLANTS_START = 'http://localhost:3003/high-risk-plants/start'

afterEach(() => {
  configState.animals = configState.defaults.animals
  configState.plants = configState.defaults.plants
})

describe('#NOTIFICATION_TYPES', () => {
  test('offers the types in the order the question shows them', () => {
    expect(NOTIFICATION_TYPES.map(({ value }) => value)).toEqual([
      LIVE_ANIMALS,
      'germinal-products',
      'plants-for-planting',
      POTATOES,
      'wood-products'
    ])
  })
})

describe('#startUrlFor', () => {
  test.each([
    [LIVE_ANIMALS, ANIMALS_START],
    ['germinal-products', 'http://localhost:3000/germinal-products/start'],
    ['plants-for-planting', PLANTS_START],
    [POTATOES, PLANTS_START],
    ['wood-products', PLANTS_START]
  ])('hands %s over to %s', (value, expected) => {
    expect(startUrlFor(value)).toBe(expected)
  })

  test('does not double the slash when a configured base URL ends in one', () => {
    configState.animals = 'http://localhost:3000/'
    configState.plants = 'http://localhost:3003/'

    expect(startUrlFor(LIVE_ANIMALS)).toBe(ANIMALS_START)
    expect(startUrlFor(POTATOES)).toBe(PLANTS_START)
  })
})
