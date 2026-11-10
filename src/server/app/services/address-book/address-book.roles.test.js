import { describe, expect, test } from 'vitest'

import { VALID_ADDRESS_RECORD } from '../../../common/test-helpers/address-book-requests.js'
import {
  STUB_SEED_ADDRESS_NAME,
  listedStubNames
} from '../../../common/test-helpers/address-book-stub.js'
import { refuseOutboundHttp } from '../../../common/test-helpers/real-mode.js'
import { ADDRESS_TYPES, ROLES_BY_ADDRESS_TYPE } from './address-types.js'
import * as addressBook from './index.js'
import { TYPED_SEED } from './typed-seed.js'

describe('in stub mode, listing by role', () => {
  refuseOutboundHttp()

  const TYPED_ORGANISATION_ID = 'stub-org-typed'
  const DEFAULT_ORGANISATION_ID = 'stub-org-default-roles'
  const {
    originAndConsignor,
    placeOfOrigin,
    consigneeAndDestination,
    importer,
    branch,
    branchDepot
  } = TYPED_SEED

  test('Should seed each typed address with its roles and no address type', async () => {
    const { items } = await addressBook.listAddresses(TYPED_ORGANISATION_ID, {
      pageSize: 8
    })

    expect(
      items.map(({ name, addressType, roles }) => [name, addressType, roles])
    ).toEqual([
      ['Stub Origin Farm', undefined, ['PLACE_OF_ORIGIN', 'CONSIGNOR']],
      ['Stub Pasture Farm', undefined, ['PLACE_OF_ORIGIN']],
      ['Stub Consignee Farm', undefined, ['CONSIGNEE', 'PLACE_OF_DESTINATION']],
      ['Stub Importer Farm', undefined, ['IMPORTER']],
      ['Stub Branch Farm', undefined, ['BRANCH_ADDRESS']],
      ['Stub Branch Depot', undefined, ['BRANCH_ADDRESS']]
    ])
  })

  test('Should seed the default address as a place of origin and consignor', async () => {
    const { items } = await addressBook.listAddresses(DEFAULT_ORGANISATION_ID, {
      pageSize: 8
    })

    expect(items.map(({ name, roles }) => [name, roles])).toEqual([
      [STUB_SEED_ADDRESS_NAME, ['PLACE_OF_ORIGIN', 'CONSIGNOR']]
    ])
  })

  test('Should list exactly the addresses holding any Origin or Consignor role', async () => {
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        roles: ROLES_BY_ADDRESS_TYPE[ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR]
      })
    ).toEqual([originAndConsignor.name, placeOfOrigin.name])
  })

  test('Should list exactly the addresses holding any Destination, Consignee or Importer role', async () => {
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        roles:
          ROLES_BY_ADDRESS_TYPE[ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER]
      })
    ).toEqual([consigneeAndDestination.name, importer.name])
  })

  test('Should list exactly the addresses holding the branch address role', async () => {
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        roles: ['BRANCH_ADDRESS']
      })
    ).toEqual([branch.name, branchDepot.name])
  })

  test('Should list every live address when no role is given', async () => {
    expect(await listedStubNames(TYPED_ORGANISATION_ID, {})).toEqual([
      originAndConsignor.name,
      placeOfOrigin.name,
      consigneeAndDestination.name,
      importer.name,
      branch.name,
      branchDepot.name
    ])
  })

  test('Should apply the search term within the roles', async () => {
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        roles: ['BRANCH_ADDRESS'],
        searchTerm: 'depot'
      })
    ).toEqual([branchDepot.name])
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        roles: ROLES_BY_ADDRESS_TYPE[ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR],
        searchTerm: 'depot'
      })
    ).toEqual([])
  })

  test('Should list exactly the addresses holding the one role', async () => {
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, { roles: ['CONSIGNOR'] })
    ).toEqual([originAndConsignor.name])
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, { roles: ['CONSIGNEE'] })
    ).toEqual([consigneeAndDestination.name])
  })

  test('Should count and page over every address holding the role', async () => {
    const ownOrganisationId = 'stub-org-role-pages-empty'
    for (const [name, roles] of [
      ['First Consignor', ['CONSIGNOR']],
      ['Second Consignor', ['CONSIGNOR']],
      ['Third Consignor', ['CONSIGNOR']],
      ['Only Origin', ['PLACE_OF_ORIGIN']]
    ]) {
      await addressBook.createAddress(ownOrganisationId, {
        ...VALID_ADDRESS_RECORD,
        name,
        roles
      })
    }

    const secondPage = await addressBook.listAddresses(ownOrganisationId, {
      page: 2,
      pageSize: 1,
      roles: ['CONSIGNOR']
    })

    expect(secondPage).toMatchObject({ totalItems: 3, totalPages: 3 })
    expect(secondPage.items.map(({ name }) => name)).toEqual([
      'Second Consignor'
    ])
  })

  test('Should seed a roles-paged organisation with more than one page of addresses per role', async () => {
    const rolesPagedOrganisationId = 'stub-org-roles-paged'
    const totalHolding = async (roles) =>
      (
        await addressBook.listAddresses(rolesPagedOrganisationId, {
          pageSize: 8,
          roles
        })
      ).totalItems

    expect(await totalHolding(['PLACE_OF_ORIGIN'])).toBe(22)
    expect(await totalHolding(['CONSIGNOR'])).toBe(11)
    expect(await totalHolding(['BRANCH_ADDRESS'])).toBe(9)
    expect(
      await listedStubNames(rolesPagedOrganisationId, {
        roles: ['BRANCH_ADDRESS'],
        searchTerm: 'depot 9'
      })
    ).toEqual(['Stub Hill Depot 9'])
  })

  test('Should match a search role as it matches a search term, within the roles', async () => {
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        roles: ROLES_BY_ADDRESS_TYPE[ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR],
        searchTerm: 'consignor',
        searchRoles: ['CONSIGNOR']
      })
    ).toEqual([originAndConsignor.name])
    expect(
      await listedStubNames(TYPED_ORGANISATION_ID, {
        roles: ['BRANCH_ADDRESS'],
        searchTerm: 'consignor',
        searchRoles: ['CONSIGNOR']
      })
    ).toEqual([])
  })
})

describe('in stub mode, saving roles', () => {
  refuseOutboundHttp()

  const ORGANISATION_ID = 'stub-org-role-refusals'

  test.each([
    ['no roles', { roles: [] }, ['roles']],
    [
      'roles from more than one group',
      { roles: ['PLACE_OF_ORIGIN', 'CONSIGNEE'] },
      ['roles']
    ],
    [
      'a receiving role outside the United Kingdom',
      { roles: ['CONSIGNEE'], countryCode: 'FR' },
      ['countryCode']
    ]
  ])(
    'Should refuse a create with %s, keyed by the field at fault',
    async (_case, overrides, faultyFields) => {
      const refusal = await addressBook
        .createAddress(ORGANISATION_ID, {
          ...VALID_ADDRESS_RECORD,
          ...overrides
        })
        .catch((err) => err)

      expect(refusal.status).toBe(400)
      expect(Object.keys(refusal.body.errors)).toEqual(faultyFields)
    }
  )

  test('Should save a branch address outside the United Kingdom', async () => {
    const created = await addressBook.createAddress(ORGANISATION_ID, {
      ...VALID_ADDRESS_RECORD,
      roles: ['BRANCH_ADDRESS'],
      countryCode: 'FR'
    })

    expect(created).toMatchObject({
      roles: ['BRANCH_ADDRESS'],
      countryCode: 'FR'
    })
  })

  test('Should refuse an update that leaves the address with no roles', async () => {
    const created = await addressBook.createAddress(
      ORGANISATION_ID,
      VALID_ADDRESS_RECORD
    )

    const refusal = await addressBook
      .updateAddress(ORGANISATION_ID, created.id, {
        ...VALID_ADDRESS_RECORD,
        roles: []
      })
      .catch((err) => err)

    expect(refusal.status).toBe(400)
    expect(Object.keys(refusal.body.errors)).toEqual(['roles'])
  })
})
