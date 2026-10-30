import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import { config } from '../../../../config/config.js'
import { ADDRESS_ID } from '../../../common/test-helpers/address-book-requests.js'
import {
  ANIMALS_BASE_URL,
  ANY_COUNTRY_ROLES,
  CONSIGNMENT_CONTACT_HANDSHAKE,
  handshakeContextOf,
  JOURNEY_HANDSHAKES_BY_ROLE,
  returnUrlFor,
  UNITED_KINGDOM_ROLES
} from '../../../common/test-helpers/journey-handshake.js'
import {
  ADDRESS_LANDING,
  CONSIGNMENT_CONTACT_FULFILMENT_ID,
  buildReturnUrl,
  isConsignmentContact,
  isKnownJourneyType,
  JOURNEY_TYPES,
  requiresUnitedKingdomAddress
} from './journey-registry.js'

const UNREGISTERED_JOURNEY_TYPE = 'not-a-journey'
const CONSIGNOR_HANDSHAKE = JOURNEY_HANDSHAKES_BY_ROLE.consignor
const CONSIGNOR_CONTEXT = handshakeContextOf(CONSIGNOR_HANDSHAKE)
const BASE_URL_CONFIG_KEY = 'tradeImportsAnimalsFrontend.baseUrl'

describe('journey-registry', () => {
  beforeEach(() => {
    config.set(BASE_URL_CONFIG_KEY, ANIMALS_BASE_URL)
  })

  afterAll(() => {
    config.set(BASE_URL_CONFIG_KEY, ANIMALS_BASE_URL)
  })

  describe('isKnownJourneyType', () => {
    test('recognises the live-animals journey type', () => {
      expect(isKnownJourneyType(JOURNEY_TYPES.GBN_AG)).toBe(true)
      expect(isKnownJourneyType(UNREGISTERED_JOURNEY_TYPE)).toBe(false)
    })
  })

  describe('requiresUnitedKingdomAddress', () => {
    test.each(UNITED_KINGDOM_ROLES)('is true for the %s handshake', (role) => {
      expect(
        requiresUnitedKingdomAddress(
          handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE[role])
        )
      ).toBe(true)
    })

    test.each(ANY_COUNTRY_ROLES)('is false for the %s handshake', (role) => {
      expect(
        requiresUnitedKingdomAddress(
          handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE[role])
        )
      ).toBe(false)
    })

    test('is false for the contact address and for a fulfilment id the registry does not list', () => {
      expect(
        requiresUnitedKingdomAddress({
          journeyType: JOURNEY_TYPES.GBN_AG,
          fulfilmentId: CONSIGNMENT_CONTACT_FULFILMENT_ID
        })
      ).toBe(false)
      expect(
        requiresUnitedKingdomAddress({
          journeyType: JOURNEY_TYPES.GBN_AG,
          fulfilmentId: 'not-a-fulfilment-id'
        })
      ).toBe(false)
    })

    test('is false for a consignee fulfilment id under an unregistered journey type, and for no context', () => {
      expect(
        requiresUnitedKingdomAddress({
          journeyType: UNREGISTERED_JOURNEY_TYPE,
          fulfilmentId: JOURNEY_HANDSHAKES_BY_ROLE.consignee['fulfilment-id']
        })
      ).toBe(false)
      expect(requiresUnitedKingdomAddress(null)).toBe(false)
    })
  })

  describe('isConsignmentContact', () => {
    test('is true for the consignment contact handshake', () => {
      expect(
        isConsignmentContact(handshakeContextOf(CONSIGNMENT_CONTACT_HANDSHAKE))
      ).toBe(true)
    })

    test.each(Object.entries(JOURNEY_HANDSHAKES_BY_ROLE))(
      'is false for the %s handshake',
      (_role, handshake) => {
        expect(isConsignmentContact(handshakeContextOf(handshake))).toBe(false)
      }
    )

    test('is false for no context and for the contact fulfilment id under an unregistered journey type', () => {
      expect(isConsignmentContact(null)).toBe(false)
      expect(
        isConsignmentContact({
          journeyType: UNREGISTERED_JOURNEY_TYPE,
          fulfilmentId: CONSIGNMENT_CONTACT_HANDSHAKE['fulfilment-id']
        })
      ).toBe(false)
    })
  })

  describe('buildReturnUrl', () => {
    test('substitutes opaque ids into the registry template', () => {
      const url = buildReturnUrl(CONSIGNOR_CONTEXT, { addressId: ADDRESS_ID })

      expect(url).toBe(
        returnUrlFor(CONSIGNOR_HANDSHAKE, { addressId: ADDRESS_ID })
      )
    })

    test("returns under the journey set's base, not the frontend root", () => {
      const url = new URL(buildReturnUrl(CONSIGNOR_CONTEXT))

      expect(url.pathname.startsWith('/live-animals/')).toBe(true)
    })

    test.each([ADDRESS_LANDING.SELECT, ADDRESS_LANDING.RETURN])(
      'carries the address id and the %s landing',
      (landing) => {
        const url = buildReturnUrl(CONSIGNOR_CONTEXT, {
          addressId: ADDRESS_ID,
          landing
        })

        expect(url).toBe(
          returnUrlFor(CONSIGNOR_HANDSHAKE, { addressId: ADDRESS_ID, landing })
        )
      }
    )

    test('carries the cancel landing and no address id', () => {
      const url = buildReturnUrl(CONSIGNOR_CONTEXT, {
        landing: ADDRESS_LANDING.CANCEL
      })

      expect(url).toBe(
        returnUrlFor(CONSIGNOR_HANDSHAKE, { landing: ADDRESS_LANDING.CANCEL })
      )
    })

    test('carries neither an address id nor a landing when given neither', () => {
      const url = buildReturnUrl(CONSIGNOR_CONTEXT)

      expect(url).toBe(returnUrlFor(CONSIGNOR_HANDSHAKE))
    })

    test('strips a trailing slash from the animals base URL', () => {
      config.set(BASE_URL_CONFIG_KEY, `${ANIMALS_BASE_URL}/`)

      const url = buildReturnUrl(CONSIGNOR_CONTEXT)

      expect(url).toBe(returnUrlFor(CONSIGNOR_HANDSHAKE))
    })

    test('URI-encodes opaque ids that contain reserved characters', () => {
      const handshake = {
        'journey-type': JOURNEY_TYPES.GBN_AG,
        'notification-id': 'GBN-AG/26?x',
        'fulfilment-id': '9ad1&b=c/d'
      }

      const url = buildReturnUrl(handshakeContextOf(handshake))

      expect(url).toBe(returnUrlFor(handshake))
    })

    test('throws for an unregistered journey type', () => {
      expect(() =>
        buildReturnUrl({
          ...CONSIGNOR_CONTEXT,
          journeyType: UNREGISTERED_JOURNEY_TYPE
        })
      ).toThrow(`Unknown journey type "${UNREGISTERED_JOURNEY_TYPE}"`)
    })

    test('throws when notificationId or fulfilmentId is missing', () => {
      const { fulfilmentId: _fulfilmentId, ...contextWithoutFulfilmentId } =
        CONSIGNOR_CONTEXT

      expect(() => buildReturnUrl(contextWithoutFulfilmentId)).toThrow(
        'Handshake context must include notificationId and fulfilmentId'
      )
    })
  })
})
