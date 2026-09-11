import { describe, expect, test } from 'vitest'

import { config } from '#/config/config.js'
import {
  buildReturnUrl,
  isKnownJourneyType,
  JOURNEY_TYPES
} from './journey-registry.js'

describe('journey-registry', () => {
  test('recognises the live-animals journey type', () => {
    expect(isKnownJourneyType(JOURNEY_TYPES.GBN_AG)).toBe(true)
    expect(isKnownJourneyType('not-a-journey')).toBe(false)
  })

  test('buildReturnUrl substitutes opaque ids into the registry template', () => {
    config.set('tradeImportsAnimalsFrontend.baseUrl', 'http://localhost:3000')

    const url = buildReturnUrl(
      {
        journeyType: JOURNEY_TYPES.GBN_AG,
        notificationId: 'GBN-AG-26-4F7K2P',
        fulfilmentId: '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
      },
      { addressId: '665f1c2ab3e4d51a2c9d0e77' }
    )

    expect(url).toBe(
      'http://localhost:3000/notifications/GBN-AG-26-4F7K2P/address-return?fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d&addressId=665f1c2ab3e4d51a2c9d0e77'
    )
  })

  test('buildReturnUrl omits addressId on cancel', () => {
    config.set('tradeImportsAnimalsFrontend.baseUrl', 'http://localhost:3000')

    const url = buildReturnUrl({
      journeyType: JOURNEY_TYPES.GBN_AG,
      notificationId: 'GBN-AG-26-4F7K2P',
      fulfilmentId: '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
    })

    expect(url).toBe(
      'http://localhost:3000/notifications/GBN-AG-26-4F7K2P/address-return?fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
    )
  })

  test('buildReturnUrl strips a trailing slash from the animals base URL', () => {
    config.set('tradeImportsAnimalsFrontend.baseUrl', 'http://localhost:3000/')

    const url = buildReturnUrl({
      journeyType: JOURNEY_TYPES.GBN_AG,
      notificationId: 'GBN-AG-26-4F7K2P',
      fulfilmentId: '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
    })

    expect(url).toBe(
      'http://localhost:3000/notifications/GBN-AG-26-4F7K2P/address-return?fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
    )
  })

  test('buildReturnUrl URI-encodes opaque ids that contain reserved characters', () => {
    config.set('tradeImportsAnimalsFrontend.baseUrl', 'http://localhost:3000')
    const notificationId = 'GBN-AG/26?x'
    const fulfilmentId = '9ad1&b=c/d'

    const url = buildReturnUrl({
      journeyType: JOURNEY_TYPES.GBN_AG,
      notificationId,
      fulfilmentId
    })

    expect(url).toBe(
      `http://localhost:3000/notifications/${encodeURIComponent(notificationId)}/address-return?fulfilment-id=${encodeURIComponent(fulfilmentId)}`
    )
  })

  test('buildReturnUrl throws for an unregistered journey type', () => {
    expect(() =>
      buildReturnUrl({
        journeyType: 'not-a-journey',
        notificationId: 'GBN-AG-26-4F7K2P',
        fulfilmentId: '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
      })
    ).toThrow('Unknown journey type "not-a-journey"')
  })
})
