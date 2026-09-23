import { afterAll, describe, expect, test } from 'vitest'

import { config } from '#/config/config.js'
import { buildSetBaseUrl } from './set-base-url.js'

const configKey = 'tradeImportsAnimalsFrontend.baseUrl'
const originalBaseUrl = config.get(configKey)

describe('buildSetBaseUrl', () => {
  afterAll(() => {
    config.set(configKey, originalBaseUrl)
  })

  test('joins a base URL that carries no trailing slash to the set base', () => {
    config.set(configKey, 'http://localhost:3000')

    expect(buildSetBaseUrl(configKey, '/live-animals')).toBe(
      'http://localhost:3000/live-animals'
    )
  })

  test('strips a trailing slash from the base URL before joining', () => {
    config.set(configKey, 'http://localhost:3000/')

    expect(buildSetBaseUrl(configKey, '/live-animals')).toBe(
      'http://localhost:3000/live-animals'
    )
  })

  test('appends the set base verbatim', () => {
    config.set(configKey, 'https://animals.example')

    expect(buildSetBaseUrl(configKey, '/high-risk-plants')).toBe(
      'https://animals.example/high-risk-plants'
    )
  })
})
