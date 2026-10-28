import { beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  addressApiPath,
  addressesApiPath,
  ORGANISATION_ID_HEADER,
  pageOf
} from '../../../common/test-helpers/address-book-requests.js'
import {
  addressBookApi,
  refuseOutboundHttp,
  runInRealMode
} from '../../../common/test-helpers/real-mode.js'
import { ORGANISATION_ID } from '../../../common/test-helpers/session-auth.js'
import * as addressBook from './index.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'
const TRACING_HEADER = config.get('tracing.header')
const TRACE_ID = 'trace-123'

const highlandAddress = {
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com'
}

const PAGE_SIZE = 8

const EMAIL_FORMAT_ERROR = 'Enter an email address in the correct format'

const validationProblem = {
  type: 'https://api.cdp.defra.cloud/problems/validation-error',
  errors: {
    email: [EMAIL_FORMAT_ERROR]
  }
}

describe('against the real address book', () => {
  runInRealMode()

  beforeEach(() => {
    getTraceIdMock.mockReturnValue(TRACE_ID)
  })

  describe('#listAddresses', () => {
    test('Should GET the organisation path with the organisation and trace headers and parse the page', async () => {
      const scope = addressBookApi()
        .get(addressesApiPath())
        .query({ page: '1', pageSize: String(PAGE_SIZE) })
        .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
        .matchHeader(TRACING_HEADER, TRACE_ID)
        .reply(
          200,
          pageOf([{ id: 'abc', name: 'Farm', addressLine1: '1 Road' }], {
            pageSize: PAGE_SIZE
          })
        )

      const addressPage = await addressBook.listAddresses(ORGANISATION_ID, {
        page: 1,
        pageSize: PAGE_SIZE
      })

      expect(addressPage.pageSize).toBe(PAGE_SIZE)
      expect(addressPage.totalItems).toBe(1)
      expect(addressPage.items[0].addressLine1).toBe('1 Road')
      expect(scope.isDone()).toBe(true)
    })

    test('Should forward the page size, the search term and one countryCode query parameter for each country code', async () => {
      const scope = addressBookApi()
        .get(addressesApiPath())
        .query({
          page: '1',
          pageSize: String(PAGE_SIZE),
          q: 'united',
          countryCode: ['GB', 'US']
        })
        .reply(200, pageOf([], { pageSize: PAGE_SIZE }))

      await addressBook.listAddresses(ORGANISATION_ID, {
        page: 1,
        pageSize: PAGE_SIZE,
        searchTerm: 'united',
        countryCodes: ['GB', 'US']
      })

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('#createAddress', () => {
    test('Should POST the address with the organisation header and return the created record', async () => {
      const scope = addressBookApi()
        .post(addressesApiPath(), highlandAddress)
        .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
        .reply(201, { id: ADDRESS_ID, ...highlandAddress })

      const createdAddress = await addressBook.createAddress(
        ORGANISATION_ID,
        highlandAddress
      )

      expect(createdAddress.id).toBe(ADDRESS_ID)
      expect(scope.isDone()).toBe(true)
    })

    test('Should raise the validation problem with its status and field errors on a 400', async () => {
      addressBookApi().post(addressesApiPath()).reply(400, validationProblem)

      await expect(
        addressBook.createAddress(ORGANISATION_ID, {
          ...highlandAddress,
          email: 'bad'
        })
      ).rejects.toMatchObject({
        status: 400,
        body: { errors: validationProblem.errors }
      })
    })
  })

  describe('#getAddress', () => {
    test('Should GET by id with the organisation and trace headers', async () => {
      const scope = addressBookApi()
        .get(addressApiPath(ADDRESS_ID))
        .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
        .matchHeader(TRACING_HEADER, TRACE_ID)
        .reply(200, { id: ADDRESS_ID, ...highlandAddress, deleted: false })

      const address = await addressBook.getAddress(ORGANISATION_ID, ADDRESS_ID)

      expect(address.name).toBe('Highland Livestock Ltd')
      expect(address.deleted).toBe(false)
      expect(scope.isDone()).toBe(true)
    })

    test('Should encode the organisation and address ids in the path', async () => {
      const organisationIdWithSlash = 'org/id'
      const scope = addressBookApi()
        .get(
          addressApiPath(
            encodeURIComponent(ADDRESS_ID),
            encodeURIComponent(organisationIdWithSlash)
          )
        )
        .matchHeader(ORGANISATION_ID_HEADER, organisationIdWithSlash)
        .reply(200, { id: ADDRESS_ID, name: 'Farm', deleted: false })

      await addressBook.getAddress(organisationIdWithSlash, ADDRESS_ID)

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('#updateAddress', () => {
    test('Should PUT the address with the organisation header and return the updated record', async () => {
      const scope = addressBookApi()
        .put(addressApiPath(ADDRESS_ID), highlandAddress)
        .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
        .reply(200, { id: ADDRESS_ID, ...highlandAddress })

      const updatedAddress = await addressBook.updateAddress(
        ORGANISATION_ID,
        ADDRESS_ID,
        highlandAddress
      )

      expect(updatedAddress.id).toBe(ADDRESS_ID)
      expect(scope.isDone()).toBe(true)
    })

    test('Should raise the validation problem with its status and field errors on a 400', async () => {
      addressBookApi()
        .put(addressApiPath(ADDRESS_ID))
        .reply(400, validationProblem)

      await expect(
        addressBook.updateAddress(ORGANISATION_ID, ADDRESS_ID, {
          ...highlandAddress,
          email: 'bad'
        })
      ).rejects.toMatchObject({
        status: 400,
        body: { errors: validationProblem.errors }
      })
    })
  })

  describe('#deleteAddress', () => {
    test('Should DELETE by id with the organisation header', async () => {
      const scope = addressBookApi()
        .delete(addressApiPath(ADDRESS_ID))
        .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
        .reply(204)

      await addressBook.deleteAddress(ORGANISATION_ID, ADDRESS_ID)

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('on a failure', () => {
    test('Should surface the API message and status when the body has no detail', async () => {
      addressBookApi()
        .get(addressesApiPath())
        .query({ page: '1', pageSize: String(PAGE_SIZE) })
        .reply(404, {
          message: 'No static resource organisation/5900001/addresses.'
        })

      await expect(
        addressBook.listAddresses(ORGANISATION_ID, {
          page: 1,
          pageSize: PAGE_SIZE
        })
      ).rejects.toMatchObject({
        message: 'No static resource organisation/5900001/addresses.',
        status: 404
      })
    })
  })

  describe('without an organisation', () => {
    test('Should refuse to reach the address book rather than ask for an organisation named "undefined"', async () => {
      const refusal = /without an organisation/

      await expect(addressBook.listAddresses(undefined)).rejects.toThrow(
        refusal
      )
      await expect(
        addressBook.createAddress(undefined, highlandAddress)
      ).rejects.toThrow(refusal)
      await expect(
        addressBook.getAddress(undefined, ADDRESS_ID)
      ).rejects.toThrow(refusal)
      await expect(
        addressBook.updateAddress(undefined, ADDRESS_ID, highlandAddress)
      ).rejects.toThrow(refusal)
      await expect(
        addressBook.deleteAddress(undefined, ADDRESS_ID)
      ).rejects.toThrow(refusal)
    })
  })
})

describe('#mapApiErrorsToFormErrors', () => {
  test('Should keep the first message for each field the problem names', () => {
    expect(
      addressBook.mapApiErrorsToFormErrors({
        errors: {
          addressLine1: ['Enter address line 1'],
          email: [
            EMAIL_FORMAT_ERROR,
            'Email address must be 254 characters or fewer'
          ]
        }
      })
    ).toEqual({
      addressLine1: 'Enter address line 1',
      email: EMAIL_FORMAT_ERROR
    })
  })

  test('Should map a problem without field errors to no errors', () => {
    expect(addressBook.mapApiErrorsToFormErrors({})).toEqual({})
    expect(addressBook.mapApiErrorsToFormErrors(undefined)).toEqual({})
  })
})

describe('the public surface', () => {
  test('Should expose the five address operations, the error mapper and the validation-failure predicate, nothing else', () => {
    expect(Object.keys(addressBook).sort()).toEqual([
      'createAddress',
      'deleteAddress',
      'getAddress',
      'isValidationFailure',
      'listAddresses',
      'mapApiErrorsToFormErrors',
      'updateAddress'
    ])
  })
})

describe('#isValidationFailure', () => {
  test('Should recognise the 400 the client raises with field errors', () => {
    expect(
      addressBook.isValidationFailure({
        status: 400,
        body: { errors: { email: ['Enter an email address'] } }
      })
    ).toBe(true)
  })

  test('Should refuse any other failure, including a 400 without field errors', () => {
    expect(addressBook.isValidationFailure({ status: 400, body: {} })).toBe(
      false
    )
    expect(
      addressBook.isValidationFailure({ status: 500, body: { errors: {} } })
    ).toBe(false)
    expect(addressBook.isValidationFailure(undefined)).toBe(false)
  })
})

describe('in stub mode', () => {
  refuseOutboundHttp()

  const PAGINATED_ORGANISATION_ID = 'stub-org-paginated'
  const SEED_ADDRESS_NAME = 'Stub Farm 1'
  const GLEN_DEPOT = 'Glen Depot'
  const PARIS_DEPOT = 'Paris Depot'
  const BOSTON_DEPOT = 'Boston Depot'

  const listedNames = async (organisationId, query = {}) =>
    (
      await addressBook.listAddresses(organisationId, {
        pageSize: PAGE_SIZE,
        ...query
      })
    ).items.map(({ name }) => name)

  test('Should seed one GB address, Stub Farm 1 at id 000000000000000000000001, for an ordinary organisation', async () => {
    const { items, totalItems } = await addressBook.listAddresses(
      'stub-org-1',
      {
        pageSize: PAGE_SIZE
      }
    )

    expect(totalItems).toBe(1)
    expect(items[0]).toMatchObject({
      id: '000000000000000000000001',
      name: SEED_ADDRESS_NAME,
      countryCode: 'GB'
    })
  })

  test('Should seed nothing, over no pages, for an organisation ending in -empty', async () => {
    const addressPage = await addressBook.listAddresses('stub-org-empty', {
      pageSize: PAGE_SIZE
    })

    expect(addressPage).toMatchObject({ totalItems: 0, totalPages: 0 })
    expect(addressPage.items).toEqual([])
  })

  test('Should seed thirty addresses for an organisation ending in -paginated, over four pages of 8', async () => {
    const pages = await Promise.all(
      [1, 2, 3, 4].map((page) =>
        addressBook.listAddresses(PAGINATED_ORGANISATION_ID, {
          page,
          pageSize: PAGE_SIZE
        })
      )
    )

    expect(pages.map((addressPage) => addressPage.items.length)).toEqual([
      8, 8, 8, 6
    ])
    expect(pages[0]).toMatchObject({ totalItems: 30, totalPages: 4, page: 1 })
  })

  test('Should list only the addresses with the search term inside a name, address line, town, county or postcode, ignoring case', async () => {
    const organisationId = 'stub-org-search-fields'
    await addressBook.createAddress(organisationId, {
      ...highlandAddress,
      name: GLEN_DEPOT,
      addressLine2: 'Ballymore Road',
      county: 'Antrim'
    })

    const search = (searchTerm) => listedNames(organisationId, { searchTerm })

    expect(await search('glen')).toEqual([GLEN_DEPOT])
    expect(await search('iv2 3jh')).toEqual([GLEN_DEPOT])
    expect(await search(' BALLYMORE ')).toEqual([GLEN_DEPOT])
    expect(await search('antrim')).toEqual([GLEN_DEPOT])
    expect(await search('inverness')).toEqual([GLEN_DEPOT])
    expect(await search('stub way')).toEqual([SEED_ADDRESS_NAME])
    expect(await search('stubton')).toEqual([SEED_ADDRESS_NAME])
  })

  test('Should count the matches of a search over the whole book, not only the page', async () => {
    const addressPage = await addressBook.listAddresses(
      PAGINATED_ORGANISATION_ID,
      { page: 2, pageSize: PAGE_SIZE, searchTerm: 'farm 1' }
    )

    expect(addressPage).toMatchObject({
      totalItems: 11,
      totalPages: 2,
      page: 2
    })
    expect(addressPage.items).toHaveLength(3)
  })

  test('Should list created addresses newest first, ahead of the seeded address', async () => {
    const organisationId = 'stub-org-newest-first'
    await addressBook.createAddress(organisationId, {
      ...highlandAddress,
      name: GLEN_DEPOT
    })
    await addressBook.createAddress(organisationId, {
      ...highlandAddress,
      name: PARIS_DEPOT
    })

    expect(await listedNames(organisationId)).toEqual([
      PARIS_DEPOT,
      GLEN_DEPOT,
      SEED_ADDRESS_NAME
    ])
  })

  test('Should list the addresses in any of the country codes, or matching the search term, newest first', async () => {
    const organisationId = 'stub-org-country-codes'
    await addressBook.createAddress(organisationId, {
      ...highlandAddress,
      name: PARIS_DEPOT,
      countryCode: 'FR'
    })
    await addressBook.createAddress(organisationId, {
      ...highlandAddress,
      name: BOSTON_DEPOT,
      countryCode: 'US'
    })

    expect(
      await listedNames(organisationId, { countryCodes: ['FR', 'US'] })
    ).toEqual([BOSTON_DEPOT, PARIS_DEPOT])
    expect(
      await listedNames(organisationId, {
        searchTerm: 'stub farm',
        countryCodes: ['FR']
      })
    ).toEqual([PARIS_DEPOT, SEED_ADDRESS_NAME])
  })

  test('Should report no matches over no pages for a search that matches nothing', async () => {
    const addressPage = await addressBook.listAddresses(
      PAGINATED_ORGANISATION_ID,
      { pageSize: PAGE_SIZE, searchTerm: 'zzznomatch' }
    )

    expect(addressPage).toMatchObject({ totalItems: 0, totalPages: 0 })
  })

  test('Should round-trip an address through create, update and delete', async () => {
    const organisationId = 'stub-org-round-trip'

    const created = await addressBook.createAddress(
      organisationId,
      highlandAddress
    )
    expect(created.id).toMatch(/^[0-9a-f]{24}$/)
    expect(
      await addressBook.getAddress(organisationId, created.id)
    ).toMatchObject(highlandAddress)

    const updated = await addressBook.updateAddress(
      organisationId,
      created.id,
      {
        name: 'Updated Farm Ltd'
      }
    )
    expect(updated).toMatchObject({
      id: created.id,
      name: 'Updated Farm Ltd',
      postcode: 'IV2 3JH'
    })

    await addressBook.deleteAddress(organisationId, created.id)
    expect(
      await addressBook.getAddress(organisationId, created.id)
    ).toMatchObject({ id: created.id, deleted: true })
  })

  test('Should leave a deleted address out of the list and refuse to update it', async () => {
    const organisationId = 'stub-org-tombstone'
    const created = await addressBook.createAddress(
      organisationId,
      highlandAddress
    )
    expect(created.deleted).toBe(false)

    await addressBook.deleteAddress(organisationId, created.id)

    const { items } = await addressBook.listAddresses(organisationId, {
      pageSize: PAGE_SIZE
    })
    expect(items.map(({ id }) => id)).toEqual(['000000000000000000000001'])
    await expect(
      addressBook.updateAddress(organisationId, created.id, { name: 'Again' })
    ).rejects.toMatchObject({ status: 404 })
  })

  test('Should refuse with a 404 to delete an address the organisation does not hold', async () => {
    await expect(
      addressBook.deleteAddress('stub-org-unknown-delete', ADDRESS_ID)
    ).rejects.toMatchObject({ status: 404 })
  })
})
