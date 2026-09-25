import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  buildReturnUrl,
  isKnownJourneyType,
  JOURNEY_TYPES
} from './journey-registry.js'

const defaultAnimalsBaseUrl = 'http://localhost:3000'
const UNREGISTERED_JOURNEY_TYPE = 'not-a-journey'
const NOTIFICATION_ID = 'GBN-AG-26-4F7K2P'
const FULFILMENT_ID = '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
const BASE_URL_CONFIG_KEY = 'tradeImportsAnimalsFrontend.baseUrl'

describe('journey-registry', () => {
  beforeEach(() => {
    config.set(BASE_URL_CONFIG_KEY, defaultAnimalsBaseUrl)
  })

  afterAll(() => {
    config.set(BASE_URL_CONFIG_KEY, defaultAnimalsBaseUrl)
  })

  test('recognises the live-animals journey type', () => {
    expect(isKnownJourneyType(JOURNEY_TYPES.GBN_AG)).toBe(true)
    expect(isKnownJourneyType(UNREGISTERED_JOURNEY_TYPE)).toBe(false)
  })

  test('buildReturnUrl substitutes opaque ids into the registry template', () => {
    const url = buildReturnUrl(
      {
        journeyType: JOURNEY_TYPES.GBN_AG,
        notificationId: NOTIFICATION_ID,
        fulfilmentId: FULFILMENT_ID
      },
      { addressId: '665f1c2ab3e4d51a2c9d0e77' }
    )

    expect(url).toBe(
      'http://localhost:3000/live-animals/notifications/GBN-AG-26-4F7K2P/address-return?fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d&addressId=665f1c2ab3e4d51a2c9d0e77'
    )
  })

  test("buildReturnUrl returns under the journey set's base, not the frontend root", () => {
    const url = new URL(
      buildReturnUrl({
        journeyType: JOURNEY_TYPES.GBN_AG,
        notificationId: 'GBN-AG-26-4F7K2P',
        fulfilmentId: '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
      })
    )

    expect(url.pathname.startsWith('/live-animals/')).toBe(true)
  })

  test('buildReturnUrl omits addressId on cancel', () => {
    const url = buildReturnUrl({
      journeyType: JOURNEY_TYPES.GBN_AG,
      notificationId: NOTIFICATION_ID,
      fulfilmentId: FULFILMENT_ID
    })

    expect(url).toBe(
      'http://localhost:3000/live-animals/notifications/GBN-AG-26-4F7K2P/address-return?fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
    )
  })

  test('buildReturnUrl strips a trailing slash from the animals base URL', () => {
    config.set(BASE_URL_CONFIG_KEY, 'http://localhost:3000/')

    const url = buildReturnUrl({
      journeyType: JOURNEY_TYPES.GBN_AG,
      notificationId: NOTIFICATION_ID,
      fulfilmentId: FULFILMENT_ID
    })

    expect(url).toBe(
      'http://localhost:3000/live-animals/notifications/GBN-AG-26-4F7K2P/address-return?fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
    )
  })

  test('buildReturnUrl URI-encodes opaque ids that contain reserved characters', () => {
    const notificationId = 'GBN-AG/26?x'
    const fulfilmentId = '9ad1&b=c/d'

    const url = buildReturnUrl({
      journeyType: JOURNEY_TYPES.GBN_AG,
      notificationId,
      fulfilmentId
    })

    expect(url).toBe(
      `http://localhost:3000/live-animals/notifications/${encodeURIComponent(notificationId)}/address-return?fulfilment-id=${encodeURIComponent(fulfilmentId)}`
    )
  })

  test('buildReturnUrl throws for an unregistered journey type', () => {
    expect(() =>
      buildReturnUrl({
        journeyType: UNREGISTERED_JOURNEY_TYPE,
        notificationId: NOTIFICATION_ID,
        fulfilmentId: FULFILMENT_ID
      })
    ).toThrow(`Unknown journey type "${UNREGISTERED_JOURNEY_TYPE}"`)
  })

  test('buildReturnUrl throws when notificationId or fulfilmentId is missing', () => {
    expect(() =>
      buildReturnUrl({
        journeyType: JOURNEY_TYPES.GBN_AG,
        notificationId: NOTIFICATION_ID
      })
    ).toThrow('Handshake context must include notificationId and fulfilmentId')
  })
})
