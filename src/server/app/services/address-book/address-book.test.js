import { beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  ADDRESSES_PATH,
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
const ADDRESS_PATH = `${ADDRESSES_PATH}/${ADDRESS_ID}`
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
        .get(ADDRESSES_PATH)
        .query({ page: '1' })
        .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
        .matchHeader(TRACING_HEADER, TRACE_ID)
        .reply(
          200,
          pageOf([{ id: 'abc', name: 'Farm', addressLine1: '1 Road' }])
        )

      const addressPage = await addressBook.listAddresses(ORGANISATION_ID, {
        page: 1
      })

      expect(addressPage.pageSize).toBe(25)
      expect(addressPage.totalItems).toBe(1)
      expect(addressPage.items[0].addressLine1).toBe('1 Road')
      expect(scope.isDone()).toBe(true)
    })

    test('Should forward the page size, the search term and one countryCode query parameter for each country code', async () => {
      const scope = addressBookApi()
        .get(ADDRESSES_PATH)
        .query({
          page: '1',
          pageSize: '8',
          q: 'united',
          countryCode: ['GB', 'US']
        })
        .reply(200, pageOf([], { pageSize: 8 }))

      await addressBook.listAddresses(ORGANISATION_ID, {
        page: 1,
        pageSize: 8,
        searchTerm: 'united',
        countryCodes: ['GB', 'US']
      })

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('#createAddress', () => {
    test('Should POST the address with the organisation header and return the created record', async () => {
      const scope = addressBookApi()
        .post(ADDRESSES_PATH, highlandAddress)
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
      addressBookApi().post(ADDRESSES_PATH).reply(400, validationProblem)

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
        .get(ADDRESS_PATH)
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
          `/organisation/${encodeURIComponent(organisationIdWithSlash)}/addresses/${encodeURIComponent(ADDRESS_ID)}`
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
        .put(ADDRESS_PATH, highlandAddress)
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
      addressBookApi().put(ADDRESS_PATH).reply(400, validationProblem)

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
        .delete(ADDRESS_PATH)
        .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
        .reply(204)

      await addressBook.deleteAddress(ORGANISATION_ID, ADDRESS_ID)

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('on a failure', () => {
    test('Should surface the API message and status when the body has no detail', async () => {
      addressBookApi().get(ADDRESSES_PATH).query({ page: '1' }).reply(404, {
        message: 'No static resource organisation/5900001/addresses.'
      })

      await expect(
        addressBook.listAddresses(ORGANISATION_ID)
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

  test('Should seed one GB address, Stub Farm 1 at id 000000000000000000000001, for an ordinary organisation', async () => {
    const { items, totalItems } = await addressBook.listAddresses(
      'stub-org-1',
      {
        pageSize: 8
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
      pageSize: 8
    })

    expect(addressPage).toMatchObject({ totalItems: 0, totalPages: 0 })
    expect(addressPage.items).toEqual([])
  })

  test('Should seed thirty addresses, which 8 a page fall across four pages, for an organisation ending in -paginated', async () => {
    const pages = await Promise.all(
      [1, 2, 3, 4].map((page) =>
        addressBook.listAddresses(PAGINATED_ORGANISATION_ID, {
          page,
          pageSize: 8
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

    const search = async (searchTerm) =>
      (
        await addressBook.listAddresses(organisationId, {
          pageSize: 8,
          searchTerm
        })
      ).items.map(({ name }) => name)

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
      { page: 2, pageSize: 8, searchTerm: 'farm 1' }
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

    const addressPage = await addressBook.listAddresses(organisationId, {
      pageSize: 8
    })

    expect(addressPage.items.map(({ name }) => name)).toEqual([
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

    const namesFor = async (query) =>
      (
        await addressBook.listAddresses(organisationId, {
          pageSize: 8,
          ...query
        })
      ).items.map(({ name }) => name)

    expect(await namesFor({ countryCodes: ['FR', 'US'] })).toEqual([
      BOSTON_DEPOT,
      PARIS_DEPOT
    ])
    expect(
      await namesFor({ searchTerm: 'stub farm', countryCodes: ['FR'] })
    ).toEqual([PARIS_DEPOT, SEED_ADDRESS_NAME])
  })

  test('Should report no matches over no pages for a search that matches nothing', async () => {
    const addressPage = await addressBook.listAddresses(
      PAGINATED_ORGANISATION_ID,
      { pageSize: 8, searchTerm: 'zzznomatch' }
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
      pageSize: 8
    })
    expect(items.map(({ id }) => id)).not.toContain(created.id)
    await expect(
      addressBook.updateAddress(organisationId, created.id, { name: 'Again' })
    ).rejects.toMatchObject({ status: 404 })
  })
})
