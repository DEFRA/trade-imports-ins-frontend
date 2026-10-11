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

const {
  NOTIFICATION_TYPES,
  TEMPLATE_TYPES,
  manageTemplatesUrl,
  startUrlFor,
  templateNameUrlFor
} = await import('./destinations.js')

const LIVE_ANIMALS = 'live-animals'
const GERMINAL_PRODUCTS = 'germinal-products'
const POTATOES = 'potatoes'
const ANIMALS_START = 'http://localhost:3000/live-animals/start'
const PLANTS_START = 'http://localhost:3003/high-risk-plants/start'
const MANAGE_TEMPLATES = 'http://localhost:3000/live-animals/templates'

afterEach(() => {
  configState.animals = configState.defaults.animals
  configState.plants = configState.defaults.plants
})

describe('#NOTIFICATION_TYPES', () => {
  test('offers the types in the order the question shows them', () => {
    expect(NOTIFICATION_TYPES.map(({ value }) => value)).toEqual([
      LIVE_ANIMALS,
      GERMINAL_PRODUCTS,
      'plants-for-planting',
      POTATOES,
      'wood-products'
    ])
  })
})

describe('#startUrlFor', () => {
  test.each([
    [LIVE_ANIMALS, ANIMALS_START],
    [GERMINAL_PRODUCTS, 'http://localhost:3000/germinal-products/start'],
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

describe('#TEMPLATE_TYPES', () => {
  test('offers only the types whose service stores templates', () => {
    expect(TEMPLATE_TYPES.map(({ value }) => value)).toEqual([
      LIVE_ANIMALS,
      GERMINAL_PRODUCTS
    ])
  })
})

describe('#manageTemplatesUrl', () => {
  test('points at Manage templates in the animals frontend', () => {
    expect(manageTemplatesUrl()).toBe(MANAGE_TEMPLATES)
  })

  test('does not double the slash when the configured base URL ends in one', () => {
    configState.animals = 'http://localhost:3000/'

    expect(manageTemplatesUrl()).toBe(MANAGE_TEMPLATES)
  })
})

describe('#templateNameUrlFor', () => {
  test('hands a new template over to the name page carrying the type', () => {
    expect(templateNameUrlFor(LIVE_ANIMALS)).toBe(
      `${MANAGE_TEMPLATES}/new?type=live-animals`
    )
  })

  test('hands a template in progress over to its own name page', () => {
    expect(templateNameUrlFor(GERMINAL_PRODUCTS, 'abc-123')).toBe(
      `${MANAGE_TEMPLATES}/abc-123/name?type=germinal-products`
    )
  })
})
