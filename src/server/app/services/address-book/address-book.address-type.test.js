import { describe, expect, test } from 'vitest'

import {
  addressesApiPath,
  pageOf
} from '../../../common/test-helpers/address-book-requests.js'
import {
  addressBookApi,
  refuseOutboundHttp,
  runInRealMode
} from '../../../common/test-helpers/real-mode.js'
import { ORGANISATION_ID } from '../../../common/test-helpers/session-auth.js'
import { ADDRESS_TYPES, USES_BY_ADDRESS_TYPE } from './address-types.js'
import * as addressBook from './index.js'
import { TYPED_SEED } from './typed-seed.js'

const PAGE_SIZE = 8

describe('against the real address book', () => {
  runInRealMode()

  test('Should forward the address type as the addressType query parameter', async () => {
    const scope = addressBookApi()
      .get(addressesApiPath())
      .query({
        page: '1',
        pageSize: String(PAGE_SIZE),
        addressType: ADDRESS_TYPES.BRANCH
      })
      .reply(200, pageOf([], { pageSize: PAGE_SIZE }))

    await addressBook.listAddresses(ORGANISATION_ID, {
      page: 1,
      pageSize: PAGE_SIZE,
      addressType: ADDRESS_TYPES.BRANCH
    })

    expect(scope.isDone()).toBe(true)
  })

  test('Should forward the use as the use query parameter and each search use as a searchUse query parameter', async () => {
    const scope = addressBookApi()
      .get(addressesApiPath())
      .query({
        page: '1',
        pageSize: String(PAGE_SIZE),
        use: 'CONSIGNOR',
        searchUse: ['CONSIGNOR', 'CONSIGNEE']
      })
      .reply(200, pageOf([], { pageSize: PAGE_SIZE }))

    await addressBook.listAddresses(ORGANISATION_ID, {
      page: 1,
      pageSize: PAGE_SIZE,
      use: 'CONSIGNOR',
      searchUses: ['CONSIGNOR', 'CONSIGNEE']
    })

    expect(scope.isDone()).toBe(true)
  })
})

describe('the uses each address type lists', () => {
  test('Should list them in the order the Type select offers them', () => {
    expect(USES_BY_ADDRESS_TYPE).toEqual({
      ORIGIN_OR_CONSIGNOR: ['PLACE_OF_ORIGIN', 'CONSIGNOR'],
      DESTINATION_CONSIGNEE_OR_IMPORTER: [
        'CONSIGNEE',
        'IMPORTER',
        'PLACE_OF_DESTINATION'
      ],
      BRANCH: ['BRANCH_ADDRESS']
    })
  })
})

describe('in stub mode, listing by address type', () => {
  refuseOutboundHttp()

  const TYPED_ORGANISATION_ID = 'stub-org-typed'
  const UNTYPED_ORGANISATION_ID = 'stub-org-untyped'
  const UNTYPED_SEED_NAME = 'Stub Farm 1'
  const {
    originAndConsignor,
    mixedOriginAndConsignee,
    importer,
    branch,
    branchDepot
  } = TYPED_SEED

  const listedNamesUnder = async (organisationId, query) =>
    (
      await addressBook.listAddresses(organisationId, {
        pageSize: PAGE_SIZE,
        ...query
      })
    ).items.map(({ name }) => name)

  test('Should list exactly the addresses holding a use of Origin or Consignor, the place of origin and consignee address included', async () => {
    expect(
      await listedNamesUnder(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR
      })
    ).toEqual([originAndConsignor.name, mixedOriginAndConsignee.name])
  })

  test('Should list exactly the addresses holding a use of Destination, Consignee or Importer, the place of origin and consignee address included', async () => {
    expect(
      await listedNamesUnder(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
      })
    ).toEqual([mixedOriginAndConsignee.name, importer.name])
  })

  test('Should list exactly the addresses holding a branch address use under Branch', async () => {
    expect(
      await listedNamesUnder(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.BRANCH
      })
    ).toEqual([branch.name, branchDepot.name])
  })

  test('Should list every live address when no address type is given', async () => {
    expect(await listedNamesUnder(TYPED_ORGANISATION_ID, {})).toEqual([
      originAndConsignor.name,
      mixedOriginAndConsignee.name,
      importer.name,
      branch.name,
      branchDepot.name
    ])
  })

  test('Should apply the search term within the address type', async () => {
    expect(
      await listedNamesUnder(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.BRANCH,
        searchTerm: 'depot'
      })
    ).toEqual([branchDepot.name])
    expect(
      await listedNamesUnder(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        searchTerm: 'depot'
      })
    ).toEqual([])
  })

  test('Should list an address with no uses under Origin or Consignor only', async () => {
    expect(
      await listedNamesUnder(UNTYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR
      })
    ).toEqual([UNTYPED_SEED_NAME])
    expect(
      await listedNamesUnder(UNTYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
      })
    ).toEqual([])
    expect(
      await listedNamesUnder(UNTYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.BRANCH
      })
    ).toEqual([])
  })

  test('Should list exactly the addresses of the tab that hold the use', async () => {
    expect(
      await listedNamesUnder(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        use: 'CONSIGNOR'
      })
    ).toEqual([originAndConsignor.name])
    expect(
      await listedNamesUnder(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
        use: 'CONSIGNEE'
      })
    ).toEqual([mixedOriginAndConsignee.name])
  })

  test('Should count and page over every address of the tab holding the use', async () => {
    const ownOrganisationId = 'stub-org-use-pages'
    for (const [name, uses] of [
      ['First Consignor', ['CONSIGNOR']],
      ['Second Consignor', ['CONSIGNOR']],
      ['Third Consignor', ['CONSIGNOR']],
      ['Only Origin', ['PLACE_OF_ORIGIN']]
    ]) {
      await addressBook.createAddress(ownOrganisationId, { name, uses })
    }

    const secondPage = await addressBook.listAddresses(ownOrganisationId, {
      page: 2,
      pageSize: 1,
      addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
      use: 'CONSIGNOR'
    })

    expect(secondPage).toMatchObject({ totalItems: 3, totalPages: 3 })
    expect(secondPage.items.map(({ name }) => name)).toEqual([
      'Second Consignor'
    ])
  })

  test('Should match a search use as it matches a search term, within the address type', async () => {
    expect(
      await listedNamesUnder(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        searchTerm: 'consignor',
        searchUses: ['CONSIGNOR']
      })
    ).toEqual([originAndConsignor.name])
    expect(
      await listedNamesUnder(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.BRANCH,
        searchTerm: 'consignor',
        searchUses: ['CONSIGNOR']
      })
    ).toEqual([])
  })
})
