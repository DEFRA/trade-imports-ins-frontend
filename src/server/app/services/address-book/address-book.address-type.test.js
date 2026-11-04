import { describe, expect, test } from 'vitest'

import { VALID_ADDRESS_RECORD } from '../../../common/test-helpers/address-book-requests.js'
import {
  STUB_SEED_ADDRESS_NAME,
  listedStubNames
} from '../../../common/test-helpers/address-book-stub.js'
import { refuseOutboundHttp } from '../../../common/test-helpers/real-mode.js'
import { ADDRESS_TYPES } from './address-types.js'
import * as addressBook from './index.js'
import { TYPED_SEED } from './typed-seed.js'

describe('in stub mode, listing by address type', () => {
  refuseOutboundHttp()

  const TYPED_ORGANISATION_ID = 'stub-org-typed'
  const UNTYPED_ORGANISATION_ID = 'stub-org-untyped'
  const {
    originAndConsignor,
    mixedOriginAndConsignee,
    importer,
    branch,
    branchDepot
  } = TYPED_SEED

  test('Should seed each typed address with its address type and its uses', async () => {
    const { items } = await addressBook.listAddresses(TYPED_ORGANISATION_ID, {
      pageSize: 8
    })

    expect(
      items.map(({ name, addressType, uses }) => [name, addressType, uses])
    ).toEqual([
      [
        'Stub Origin Farm',
        'ORIGIN_OR_CONSIGNOR',
        ['PLACE_OF_ORIGIN', 'CONSIGNOR']
      ],
      [
        'Stub Mixed Farm',
        'ORIGIN_OR_CONSIGNOR',
        ['PLACE_OF_ORIGIN', 'CONSIGNEE']
      ],
      ['Stub Importer Farm', 'DESTINATION_CONSIGNEE_OR_IMPORTER', ['IMPORTER']],
      ['Stub Branch Farm', 'BRANCH', ['BRANCH_ADDRESS']],
      ['Stub Branch Depot', 'BRANCH', ['BRANCH_ADDRESS']]
    ])
  })

  test('Should list exactly the addresses holding a use of Origin or Consignor, the place of origin and consignee address included', async () => {
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR
      })
    ).toEqual([originAndConsignor.name, mixedOriginAndConsignee.name])
  })

  test('Should list exactly the addresses holding a use of Destination, Consignee or Importer, the place of origin and consignee address included', async () => {
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
      })
    ).toEqual([mixedOriginAndConsignee.name, importer.name])
  })

  test('Should list exactly the addresses holding a branch address use under Branch', async () => {
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.BRANCH
      })
    ).toEqual([branch.name, branchDepot.name])
  })

  test('Should list every live address when no address type is given', async () => {
    expect(await listedStubNames(TYPED_ORGANISATION_ID, {})).toEqual([
      originAndConsignor.name,
      mixedOriginAndConsignee.name,
      importer.name,
      branch.name,
      branchDepot.name
    ])
  })

  test('Should apply the search term within the address type', async () => {
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.BRANCH,
        searchTerm: 'depot'
      })
    ).toEqual([branchDepot.name])
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        searchTerm: 'depot'
      })
    ).toEqual([])
  })

  test('Should list an address with no uses under Origin or Consignor only', async () => {
    expect(
      await listedStubNames(UNTYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR
      })
    ).toEqual([STUB_SEED_ADDRESS_NAME])
    expect(
      await listedStubNames(UNTYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
      })
    ).toEqual([])
    expect(
      await listedStubNames(UNTYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.BRANCH
      })
    ).toEqual([])
  })

  test('Should list exactly the addresses of the tab that hold the use', async () => {
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        use: 'CONSIGNOR'
      })
    ).toEqual([originAndConsignor.name])
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
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
      await addressBook.createAddress(ownOrganisationId, {
        ...VALID_ADDRESS_RECORD,
        name,
        uses
      })
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
      await listedStubNames(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        searchTerm: 'consignor',
        searchUses: ['CONSIGNOR']
      })
    ).toEqual([originAndConsignor.name])
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        addressType: ADDRESS_TYPES.BRANCH,
        searchTerm: 'consignor',
        searchUses: ['CONSIGNOR']
      })
    ).toEqual([])
  })
})
