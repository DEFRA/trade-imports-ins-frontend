import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import { config } from '../../../../config/config.js'
import { ADDRESS_ID } from '../../../common/test-helpers/address-book-requests.js'
import { JOURNEY_HANDSHAKE } from '../../../common/test-helpers/journey-handshake.js'
import {
  buildReturnUrl,
  isKnownJourneyType,
  JOURNEY_TYPES
} from './journey-registry.js'

const defaultAnimalsBaseUrl = 'http://localhost:3000'
const UNREGISTERED_JOURNEY_TYPE = 'not-a-journey'
const NOTIFICATION_ID = JOURNEY_HANDSHAKE['notification-id']
const FULFILMENT_ID = JOURNEY_HANDSHAKE['fulfilment-id']
const RETURN_URL_WITHOUT_ADDRESS = `${defaultAnimalsBaseUrl}/live-animals/notifications/${NOTIFICATION_ID}/address-return?fulfilment-id=${FULFILMENT_ID}`
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
      { addressId: ADDRESS_ID }
    )

    expect(url).toBe(`${RETURN_URL_WITHOUT_ADDRESS}&addressId=${ADDRESS_ID}`)
  })

  test("buildReturnUrl returns under the journey set's base, not the frontend root", () => {
    const url = new URL(
      buildReturnUrl({
        journeyType: JOURNEY_TYPES.GBN_AG,
        notificationId: NOTIFICATION_ID,
        fulfilmentId: FULFILMENT_ID
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

    expect(url).toBe(RETURN_URL_WITHOUT_ADDRESS)
  })

  test('buildReturnUrl strips a trailing slash from the animals base URL', () => {
    config.set(BASE_URL_CONFIG_KEY, 'http://localhost:3000/')

    const url = buildReturnUrl({
      journeyType: JOURNEY_TYPES.GBN_AG,
      notificationId: NOTIFICATION_ID,
      fulfilmentId: FULFILMENT_ID
    })

    expect(url).toBe(RETURN_URL_WITHOUT_ADDRESS)
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
