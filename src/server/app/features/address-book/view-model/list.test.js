import { describe, expect, test } from 'vitest'

import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import { copy } from '../copy/copy.en.js'
import {
  addressBookPageHref,
  approvalNumberTextOf,
  buildAddressBookQueryString,
  mapAddressRows,
  mapTransporterRows,
  nameLinesOf,
  resultsLabelOf,
  roleLabelsTextOf,
  rolesWhoseLabelContains,
  transporterCountryCodesMatching,
  transporterTypesWhoseLabelContains
} from './list.js'

describe('#nameLinesOf', () => {
  test('Should give the first word then the rest, single-spaced, for a name of several words', () => {
    expect(nameLinesOf('Green Valley   Farm')).toEqual(['Green', 'Valley Farm'])
  })

  test('Should give one line for a one-word name', () => {
    expect(nameLinesOf('  Farm ')).toEqual(['Farm'])
  })

  test('Should give no lines for a blank name', () => {
    expect(nameLinesOf('   ')).toEqual([])
  })
})

describe('#resultsLabelOf', () => {
  test('Should give the range label for a page with results', () => {
    expect(
      resultsLabelOf(
        { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
        copy.list
      )
    ).toBe('Showing 1-1 of 1')
  })

  test('Should give Showing 0 of 0 for a page with no results', () => {
    expect(
      resultsLabelOf(
        { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
        copy.list
      )
    ).toBe('Showing 0 of 0')
  })
})

describe('#buildAddressBookQueryString', () => {
  test('Should add the page param only after the first page', () => {
    expect(buildAddressBookQueryString({ page: 2 })).toBe('?page=2')
    expect(buildAddressBookQueryString({ page: 1 })).toBe('')
  })

  test('Should carry q before the page param', () => {
    expect(buildAddressBookQueryString({ searchTerm: 'green', page: 2 })).toBe(
      '?q=green&page=2'
    )
  })

  test('Should carry the address type before q and the page param', () => {
    expect(
      buildAddressBookQueryString({
        addressType: ADDRESS_TYPES.BRANCH,
        searchTerm: 'green',
        page: 2
      })
    ).toBe('?addressType=BRANCH&q=green&page=2')
  })

  test('Should carry the chosen filter value after q and before the page param', () => {
    expect(
      buildAddressBookQueryString({
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        searchTerm: 'green',
        filterParam: 'role',
        filterValue: 'CONSIGNOR',
        page: 2
      })
    ).toBe('?addressType=ORIGIN_OR_CONSIGNOR&q=green&role=CONSIGNOR&page=2')
  })

  test('Should carry the Transporter tab filter value under its own parameter name', () => {
    expect(
      buildAddressBookQueryString({
        addressType: ADDRESS_TYPES.TRANSPORTER,
        searchTerm: 'green',
        filterParam: 'type',
        filterValue: 'COMMERCIAL',
        page: 2
      })
    ).toBe('?addressType=TRANSPORTER&q=green&type=COMMERCIAL&page=2')
  })

  test('Should write no filter pair when no filter value is chosen', () => {
    expect(
      buildAddressBookQueryString({
        addressType: ADDRESS_TYPES.BRANCH,
        filterParam: 'role'
      })
    ).toBe('?addressType=BRANCH')
  })

  test('Should carry the address type alone on the first page with no search', () => {
    expect(
      buildAddressBookQueryString({
        addressType: ADDRESS_TYPES.BRANCH,
        page: 1
      })
    ).toBe('?addressType=BRANCH')
  })
})

describe('#addressBookPageHref', () => {
  test('Should link to the address book carrying q, adding page only after the first page', () => {
    const search = { searchTerm: 'green' }

    expect(addressBookPageHref(1, search)).toBe('/address-book?q=green')
    expect(addressBookPageHref(2, search)).toBe('/address-book?q=green&page=2')
  })

  test('Should link to /address-book with no query for the first page and no search', () => {
    expect(addressBookPageHref(1)).toBe('/address-book')
  })

  test('Should link to the address type carrying q and the page', () => {
    const search = { addressType: ADDRESS_TYPES.BRANCH, searchTerm: 'green' }

    expect(addressBookPageHref(1, search)).toBe(
      '/address-book?addressType=BRANCH&q=green'
    )
    expect(addressBookPageHref(3, search)).toBe(
      '/address-book?addressType=BRANCH&q=green&page=3'
    )
  })

  test('Should link to the address type carrying q, the role and the page', () => {
    const filters = {
      addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
      searchTerm: 'green',
      filterParam: 'role',
      filterValue: 'IMPORTER'
    }

    expect(addressBookPageHref(1, filters)).toBe(
      '/address-book?addressType=DESTINATION_CONSIGNEE_OR_IMPORTER&q=green&role=IMPORTER'
    )
    expect(addressBookPageHref(2, filters)).toBe(
      '/address-book?addressType=DESTINATION_CONSIGNEE_OR_IMPORTER&q=green&role=IMPORTER&page=2'
    )
  })
})

describe('#roleLabelsTextOf', () => {
  test.each([
    ['PLACE_OF_ORIGIN', 'Place of origin'],
    ['CONSIGNOR', 'Consignor'],
    ['CONSIGNEE', 'Consignee'],
    ['IMPORTER', 'Importer'],
    ['PLACE_OF_DESTINATION', 'Place of destination'],
    ['BRANCH_ADDRESS', 'Branch']
  ])('Should label the %s role alone as %s', (role, label) => {
    expect(roleLabelsTextOf([role], copy.list.roles)).toBe(label)
  })

  test('Should join the labels of several roles with a comma in the order stored', () => {
    expect(
      roleLabelsTextOf(['CONSIGNOR', 'PLACE_OF_ORIGIN'], copy.list.roles)
    ).toBe('Consignor, Place of origin')
  })

  test('Should show the code of a role the copy has no label for', () => {
    expect(
      roleLabelsTextOf(['CONSIGNOR', 'TRANSPORTER'], copy.list.roles)
    ).toBe('Consignor, TRANSPORTER')
  })

  test('Should give an empty label for an address with no roles', () => {
    expect(roleLabelsTextOf([], copy.list.roles)).toBe('')
  })
})

describe('#rolesWhoseLabelContains', () => {
  test.each([
    ['consignor', ['CONSIGNOR']],
    ['consign', ['CONSIGNOR', 'CONSIGNEE']],
    ['PLACE OF', ['PLACE_OF_ORIGIN', 'PLACE_OF_DESTINATION']],
    ['branch', ['BRANCH_ADDRESS']],
    ['branch address', ['BRANCH_ADDRESS']],
    ['farm', []]
  ])(
    'Should give the roles whose Type column label or Type option label contains %j, ignoring case',
    (searchTerm, roles) => {
      expect(rolesWhoseLabelContains(searchTerm, copy.list.roles)).toEqual(
        roles
      )
    }
  )

  test('Should give no roles for an empty term', () => {
    expect(rolesWhoseLabelContains('', copy.list.roles)).toEqual([])
  })
})

const GB_COUNTRY_CODE = 'GB'
const UNITED_KINGDOM_COUNTRY_LABEL = 'United Kingdom'
const COMMERCIAL_TRANSPORTER_COUNTRY_LABEL = 'Northern Ireland'
const SAMPLE_APPROVAL_NUMBER = 'NI/TA/2026/0099'

describe('#mapAddressRows', () => {
  test('Should map each address to a row with its name lines, role labels, postal lines and country label', () => {
    expect(
      mapAddressRows(
        [
          {
            id: '1',
            name: 'Green Farm',
            addressLine1: '1 Road',
            townOrCity: 'Town',
            postcode: 'AB1 2CD',
            countryCode: GB_COUNTRY_CODE,
            roles: ['PLACE_OF_ORIGIN', 'CONSIGNOR']
          }
        ],
        [{ code: GB_COUNTRY_CODE, name: UNITED_KINGDOM_COUNTRY_LABEL }],
        copy.list.roles
      )
    ).toEqual([
      {
        id: '1',
        name: 'Green Farm',
        nameLines: ['Green', 'Farm'],
        roleLabelsText: 'Place of origin, Consignor',
        postalLines: ['1 Road', 'Town', 'AB1 2CD'],
        countryLabel: UNITED_KINGDOM_COUNTRY_LABEL
      }
    ])
  })
})

describe('#approvalNumberTextOf', () => {
  test('Should give the stored approval number for a transporter that has one', () => {
    expect(
      approvalNumberTextOf(
        { approvalNumber: SAMPLE_APPROVAL_NUMBER },
        copy.notApplicable
      )
    ).toBe(SAMPLE_APPROVAL_NUMBER)
  })

  test('Should give the not-applicable word for a transporter with no approval number', () => {
    expect(approvalNumberTextOf({}, copy.notApplicable)).toBe(
      copy.notApplicable
    )
  })

  test('Should give the not-applicable word for a transporter with an empty approval number', () => {
    expect(
      approvalNumberTextOf({ approvalNumber: '' }, copy.notApplicable)
    ).toBe(copy.notApplicable)
  })

  test('Should give the not-applicable word for a transporter with a whitespace-only approval number', () => {
    expect(
      approvalNumberTextOf({ approvalNumber: '   ' }, copy.notApplicable)
    ).toBe(copy.notApplicable)
  })
})

describe('#transporterTypesWhoseLabelContains', () => {
  test('Should give the type whose label contains the term', () => {
    expect(
      transporterTypesWhoseLabelContains('commerc', copy.list.transporterTypes)
    ).toEqual(['COMMERCIAL'])
  })

  test('Should give no types for an empty term', () => {
    expect(
      transporterTypesWhoseLabelContains('', copy.list.transporterTypes)
    ).toEqual([])
  })
})

describe('#transporterCountryCodesMatching', () => {
  const COUNTRIES = [
    { code: GB_COUNTRY_CODE, name: UNITED_KINGDOM_COUNTRY_LABEL },
    { code: 'IE', name: 'Ireland' }
  ]
  const codesMatching = (searchTerm) =>
    transporterCountryCodesMatching(
      searchTerm,
      COUNTRIES,
      COMMERCIAL_TRANSPORTER_COUNTRY_LABEL
    )

  test('Should give the country a commercial transporter is stored under for the country label its row shows', () => {
    expect(codesMatching(COMMERCIAL_TRANSPORTER_COUNTRY_LABEL)).toEqual([
      'GB-NIR'
    ])
  })

  test('Should give an address country whose name contains the term', () => {
    expect(codesMatching('united king')).toEqual([GB_COUNTRY_CODE])
  })

  test('Should give both where the term matches an address country and the fixed label', () => {
    expect(codesMatching('Ireland')).toEqual(['IE', 'GB-NIR'])
  })

  test('Should give no countries for a term neither carries', () => {
    expect(codesMatching('aberdeen')).toEqual([])
  })

  test('Should give no countries for an empty term', () => {
    expect(codesMatching('')).toEqual([])
  })
})

describe('#mapTransporterRows', () => {
  test('Should map a commercial transporter to a row with its stored approval number and its fixed country label', () => {
    expect(
      mapTransporterRows(
        [
          {
            id: '1',
            name: 'Shore Road Haulage',
            addressLine1: '4 Shore Road',
            townOrCity: 'Antrim',
            postcode: 'BT41 4LB',
            countryCode: 'GB-NIR',
            type: 'COMMERCIAL',
            approvalNumber: SAMPLE_APPROVAL_NUMBER
          }
        ],
        {
          countries: [],
          copyByTransporterType: copy.list.transporterTypes,
          fixedCommercialCountryLabel: COMMERCIAL_TRANSPORTER_COUNTRY_LABEL,
          notApplicableWord: copy.notApplicable
        }
      )
    ).toEqual([
      {
        id: '1',
        name: 'Shore Road Haulage',
        nameLines: ['Shore', 'Road Haulage'],
        postalLines: [
          '4 Shore Road',
          'Antrim',
          'BT41 4LB',
          COMMERCIAL_TRANSPORTER_COUNTRY_LABEL
        ],
        approvalNumberText: SAMPLE_APPROVAL_NUMBER,
        typeLabel: 'Commercial'
      }
    ])
  })

  test('Should map a private transporter to a row with the not-applicable approval number and its resolved country label', () => {
    expect(
      mapTransporterRows(
        [
          {
            id: '2',
            name: 'Carrier Close Transporters',
            addressLine1: '4 Carrier Close',
            townOrCity: 'Carlisle',
            postcode: 'CA1 3CC',
            countryCode: GB_COUNTRY_CODE,
            type: 'PRIVATE'
          }
        ],
        {
          countries: [
            { code: GB_COUNTRY_CODE, name: UNITED_KINGDOM_COUNTRY_LABEL }
          ],
          copyByTransporterType: copy.list.transporterTypes,
          fixedCommercialCountryLabel: COMMERCIAL_TRANSPORTER_COUNTRY_LABEL,
          notApplicableWord: copy.notApplicable
        }
      )
    ).toEqual([
      {
        id: '2',
        name: 'Carrier Close Transporters',
        nameLines: ['Carrier', 'Close Transporters'],
        postalLines: [
          '4 Carrier Close',
          'Carlisle',
          'CA1 3CC',
          UNITED_KINGDOM_COUNTRY_LABEL
        ],
        approvalNumberText: copy.notApplicable,
        typeLabel: 'Private'
      }
    ])
  })
})
