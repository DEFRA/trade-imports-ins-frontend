import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import { config } from '../../../../config/config.js'
import { ADDRESS_ID } from '../../../common/test-helpers/address-book-requests.js'
import {
  ANIMALS_BASE_URL,
  ANY_COUNTRY_PARTIES,
  CONSIGNMENT_CONTACT_HANDSHAKE,
  handshakeContextOf,
  JOURNEY_HANDSHAKES_BY_PARTY,
  returnUrlFor,
  UNITED_KINGDOM_PARTIES,
  UNREGISTERED_JOURNEY_TYPE,
  ROLES_BY_PARTY
} from '../../../common/test-helpers/journey-handshake.js'
import {
  ADDRESS_LANDING,
  CONSIGNMENT_CONTACT_FULFILMENT_ID,
  rolesToSaveForParty,
  buildReturnUrl,
  isConsignmentContact,
  isResolvableHandshake,
  JOURNEY_TYPES,
  requiresUnitedKingdomAddress,
  ownAndOtherRolesOfParty
} from './journey-registry.js'

const CONSIGNOR_HANDSHAKE = JOURNEY_HANDSHAKES_BY_PARTY.consignor

const CONSIGNOR_CONTEXT = handshakeContextOf(CONSIGNOR_HANDSHAKE)

const UNRESOLVABLE_PARTY_CASES = Object.freeze([
  ['a fulfilment id the registry does not list', { fulfilmentId: 'x' }],
  [
    'a fulfilment id named like an Object property',
    { fulfilmentId: 'constructor' }
  ],
  [
    'a listed fulfilment id under an unregistered journey type',
    { journeyType: UNREGISTERED_JOURNEY_TYPE }
  ],
  ['no context', null]
])
const BASE_URL_CONFIG_KEY = 'tradeImportsAnimalsFrontend.baseUrl'

describe('journey-registry', () => {
  beforeEach(() => {
    config.set(BASE_URL_CONFIG_KEY, ANIMALS_BASE_URL)
  })

  afterAll(() => {
    config.set(BASE_URL_CONFIG_KEY, ANIMALS_BASE_URL)
  })

  describe('isResolvableHandshake', () => {
    test.each(Object.entries(JOURNEY_HANDSHAKES_BY_PARTY))(
      'is true for the %s handshake',
      (_party, handshake) => {
        expect(isResolvableHandshake(handshakeContextOf(handshake))).toBe(true)
      }
    )

    test.each(UNRESOLVABLE_PARTY_CASES)(
      'is false for %s',
      (_name, overrides) => {
        const context = overrides && { ...CONSIGNOR_CONTEXT, ...overrides }

        expect(isResolvableHandshake(context)).toBe(false)
      }
    )
  })

  describe('requiresUnitedKingdomAddress', () => {
    test.each(UNITED_KINGDOM_PARTIES)(
      'is true for the %s handshake',
      (party) => {
        expect(
          requiresUnitedKingdomAddress(
            handshakeContextOf(JOURNEY_HANDSHAKES_BY_PARTY[party])
          )
        ).toBe(true)
      }
    )

    test.each(ANY_COUNTRY_PARTIES)('is false for the %s handshake', (party) => {
      expect(
        requiresUnitedKingdomAddress(
          handshakeContextOf(JOURNEY_HANDSHAKES_BY_PARTY[party])
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

    test.each(UNRESOLVABLE_PARTY_CASES)(
      'is false for %s',
      (_name, overrides) => {
        const context = overrides && {
          ...handshakeContextOf(JOURNEY_HANDSHAKES_BY_PARTY.consignee),
          ...overrides
        }

        expect(requiresUnitedKingdomAddress(context)).toBe(false)
      }
    )
  })

  describe('isConsignmentContact', () => {
    test('is true for the consignment contact handshake', () => {
      expect(
        isConsignmentContact(handshakeContextOf(CONSIGNMENT_CONTACT_HANDSHAKE))
      ).toBe(true)
    })

    test.each(Object.entries(JOURNEY_HANDSHAKES_BY_PARTY))(
      'is false for the %s handshake',
      (_party, handshake) => {
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
      const {
        notificationId: _notificationId,
        ...contextWithoutNotificationId
      } = CONSIGNOR_CONTEXT
      const { fulfilmentId: _fulfilmentId, ...contextWithoutFulfilmentId } =
        CONSIGNOR_CONTEXT
      const missingIdsError =
        'Handshake context must include notificationId and fulfilmentId'

      expect(() => buildReturnUrl(contextWithoutNotificationId)).toThrow(
        missingIdsError
      )
      expect(() => buildReturnUrl(contextWithoutFulfilmentId)).toThrow(
        missingIdsError
      )
    })
  })
})

describe('ownAndOtherRolesOfParty', () => {
  test.each(Object.entries(ROLES_BY_PARTY))(
    'gives the %s handshake its own role and the other roles on its side',
    (party, { ownRole, otherRoles }) => {
      expect(
        ownAndOtherRolesOfParty(
          handshakeContextOf(JOURNEY_HANDSHAKES_BY_PARTY[party])
        )
      ).toEqual({ ownRole, otherRoles })
    }
  )

  test('gives the consignment contact its own role and no other roles', () => {
    expect(
      ownAndOtherRolesOfParty(handshakeContextOf(CONSIGNMENT_CONTACT_HANDSHAKE))
    ).toEqual({ ownRole: 'BRANCH_ADDRESS', otherRoles: [] })
  })

  test.each(UNRESOLVABLE_PARTY_CASES)(
    'gives no own role and no other roles for %s',
    (_name, overrides) => {
      const context = overrides && { ...CONSIGNOR_CONTEXT, ...overrides }

      expect(ownAndOtherRolesOfParty(context)).toEqual({ otherRoles: [] })
    }
  )
})

describe('rolesToSaveForParty', () => {
  test.each(Object.entries(ROLES_BY_PARTY))(
    'gives the %s handshake its one role',
    (party, { ownRole }) => {
      expect(
        rolesToSaveForParty(
          handshakeContextOf(JOURNEY_HANDSHAKES_BY_PARTY[party]),
          []
        )
      ).toEqual([ownRole])
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
    'gives the %s handshake its own role and the posted %j its side offers, in the type order',
    (party, postedRoles, roles) => {
      expect(
        rolesToSaveForParty(
          handshakeContextOf(JOURNEY_HANDSHAKES_BY_PARTY[party]),
          postedRoles
        )
      ).toEqual(roles)
    }
  )

  test('gives the consignment contact only its own role whatever is posted', () => {
    expect(
      rolesToSaveForParty(handshakeContextOf(CONSIGNMENT_CONTACT_HANDSHAKE), [
        'CONSIGNOR'
      ])
    ).toEqual(['BRANCH_ADDRESS'])
  })
})
