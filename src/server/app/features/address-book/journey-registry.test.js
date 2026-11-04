import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import { config } from '../../../../config/config.js'
import { ADDRESS_ID } from '../../../common/test-helpers/address-book-requests.js'
import {
  ANIMALS_BASE_URL,
  ANY_COUNTRY_ROLES,
  CONSIGNMENT_CONTACT_HANDSHAKE,
  CONSIGNOR_CONTEXT,
  handshakeContextOf,
  JOURNEY_HANDSHAKES_BY_ROLE,
  returnUrlFor,
  UNITED_KINGDOM_ROLES,
  UNREGISTERED_JOURNEY_TYPE,
  UNRESOLVABLE_PARTY_CASES,
  USES_BY_ROLE
} from '../../../common/test-helpers/journey-handshake.js'
import {
  ADDRESS_LANDING,
  CONSIGNMENT_CONTACT_FULFILMENT_ID,
  addressTypeAndUsesOfParty,
  buildReturnUrl,
  isConsignmentContact,
  isKnownJourneyType,
  JOURNEY_TYPES,
  requiresUnitedKingdomAddress,
  ownAndOtherUsesOfParty
} from './journey-registry.js'

const CONSIGNOR_HANDSHAKE = JOURNEY_HANDSHAKES_BY_ROLE.consignor
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

    test('is false for the consignment contact', () => {
      expect(
        requiresUnitedKingdomAddress({
          journeyType: JOURNEY_TYPES.GBN_AG,
          fulfilmentId: CONSIGNMENT_CONTACT_FULFILMENT_ID
        })
      ).toBe(false)
    })

    test('is false for a fulfilment id the registry does not list', () => {
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

describe('ownAndOtherUsesOfParty', () => {
  test.each(Object.entries(USES_BY_ROLE))(
    'gives the %s handshake its own use and the other uses on its side',
    (role, { ownUse, otherUses }) => {
      expect(
        ownAndOtherUsesOfParty(
          handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE[role])
        )
      ).toEqual({ ownUse, otherUses })
    }
  )

  test('gives the consignment contact its own use and no other uses', () => {
    expect(
      ownAndOtherUsesOfParty(handshakeContextOf(CONSIGNMENT_CONTACT_HANDSHAKE))
    ).toEqual({ ownUse: 'BRANCH_ADDRESS', otherUses: [] })
  })

  test.each(UNRESOLVABLE_PARTY_CASES)(
    'gives no own use and no other uses for %s',
    (_name, overrides) => {
      const context = overrides && { ...CONSIGNOR_CONTEXT, ...overrides }

      expect(ownAndOtherUsesOfParty(context)).toEqual({ otherUses: [] })
    }
  )
})

describe('addressTypeAndUsesOfParty', () => {
  test.each([
    ['placeOfOrigin', 'ORIGIN_OR_CONSIGNOR', 'PLACE_OF_ORIGIN'],
    ['consignor', 'ORIGIN_OR_CONSIGNOR', 'CONSIGNOR'],
    ['consignee', 'DESTINATION_CONSIGNEE_OR_IMPORTER', 'CONSIGNEE'],
    ['importer', 'DESTINATION_CONSIGNEE_OR_IMPORTER', 'IMPORTER'],
    [
      'placeOfDestination',
      'DESTINATION_CONSIGNEE_OR_IMPORTER',
      'PLACE_OF_DESTINATION'
    ]
  ])(
    'gives the %s handshake its type and its one use',
    (role, addressType, use) => {
      expect(
        addressTypeAndUsesOfParty(
          handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE[role]),
          []
        )
      ).toEqual({ addressType, uses: [use] })
    }
  )

  test.each([
    ['consignee', ['IMPORTER'], ['CONSIGNEE', 'IMPORTER']],
    ['importer', ['CONSIGNEE'], ['CONSIGNEE', 'IMPORTER']],
    [
      'importer',
      ['PLACE_OF_DESTINATION', 'CONSIGNEE'],
      ['CONSIGNEE', 'IMPORTER', 'PLACE_OF_DESTINATION']
    ],
    ['placeOfOrigin', ['CONSIGNOR'], ['PLACE_OF_ORIGIN', 'CONSIGNOR']],
    [
      'consignee',
      ['IMPORTER', 'IMPORTER', 'CONSIGNEE'],
      ['CONSIGNEE', 'IMPORTER']
    ],
    ['consignee', ['BRANCH_ADDRESS', 'CONSIGNOR'], ['CONSIGNEE']]
  ])(
    'gives the %s handshake its own use and the posted %j its side offers, in the type order',
    (role, postedUses, uses) => {
      expect(
        addressTypeAndUsesOfParty(
          handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE[role]),
          postedUses
        ).uses
      ).toEqual(uses)
    }
  )

  test('gives the consignment contact only its own use whatever is posted', () => {
    expect(
      addressTypeAndUsesOfParty(
        handshakeContextOf(CONSIGNMENT_CONTACT_HANDSHAKE),
        ['CONSIGNOR']
      )
    ).toEqual({ addressType: 'BRANCH', uses: ['BRANCH_ADDRESS'] })
  })
})
