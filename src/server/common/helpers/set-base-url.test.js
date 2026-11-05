import { afterAll, describe, expect, test } from 'vitest'

import { config } from '../../../config/config.js'
import { buildNotificationUrl, buildSetBaseUrl } from './set-base-url.js'

const LIVE_ANIMALS_BASE = '/live-animals'
const ANIMALS_HOST = 'http://localhost:3000'
const configKey = 'tradeImportsAnimalsFrontend.baseUrl'
const originalBaseUrl = config.get(configKey)

describe('buildSetBaseUrl', () => {
  afterAll(() => {
    config.set(configKey, originalBaseUrl)
  })

  test('joins a base URL that carries no trailing slash to the set base', () => {
    config.set(configKey, ANIMALS_HOST)

    expect(buildSetBaseUrl(configKey, LIVE_ANIMALS_BASE)).toBe(
      `${ANIMALS_HOST}/live-animals`
    )
  })

  test('strips a trailing slash from the base URL before joining', () => {
    config.set(configKey, `${ANIMALS_HOST}/`)

    expect(buildSetBaseUrl(configKey, LIVE_ANIMALS_BASE)).toBe(
      `${ANIMALS_HOST}/live-animals`
    )
  })

  test('appends the set base verbatim', () => {
    config.set(configKey, 'https://animals.example')

    expect(buildSetBaseUrl(configKey, '/high-risk-plants')).toBe(
      'https://animals.example/high-risk-plants'
    )
  })
})

describe('buildNotificationUrl', () => {
  afterAll(() => {
    config.set(configKey, originalBaseUrl)
  })

  test('joins the set base and the notifications path to the base URL', () => {
    config.set(configKey, `${ANIMALS_HOST}/`)

    expect(buildNotificationUrl(configKey, LIVE_ANIMALS_BASE, 'DRAFT.1')).toBe(
      `${ANIMALS_HOST}/live-animals/notifications/DRAFT.1`
    )
  })

  test('encodes the reference as one path segment', () => {
    config.set(configKey, ANIMALS_HOST)

    expect(buildNotificationUrl(configKey, LIVE_ANIMALS_BASE, 'a/b c')).toBe(
      `${ANIMALS_HOST}/live-animals/notifications/a%2Fb%20c`
    )
  })
})
