import { beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  addressBookApi,
  refuseOutboundHttp,
  runInRealMode
} from '../../../common/test-helpers/real-mode.js'
import * as addressBook from './index.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const ADDRESSES_PATH = `/organisation/${ORG_ID}/addresses`
const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'
const ADDRESS_PATH = `${ADDRESSES_PATH}/${ADDRESS_ID}`
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'
const TRACING_HEADER = config.get('tracing.header')
const TRACE_ID = 'trace-123'

const highland = {
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com'
}

const validationProblem = {
  type: 'https://api.cdp.defra.cloud/problems/validation-error',
  errors: {
    email: ['Enter an email address in the correct format']
  }
}

const pageOf = (items) => ({
  items,
  page: 1,
  pageSize: 25,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0
})

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
        .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
        .matchHeader(TRACING_HEADER, TRACE_ID)
        .reply(
          200,
          pageOf([{ id: 'abc', name: 'Farm', addressLine1: '1 Road' }])
        )

      const result = await addressBook.listAddresses(ORG_ID, { page: 1 })

      expect(result.pageSize).toBe(25)
      expect(result.totalItems).toBe(1)
      expect(result.items[0].addressLine1).toBe('1 Road')
      expect(scope.isDone()).toBe(true)
    })

    test('Should forward q and countryCode as query parameters', async () => {
      const scope = addressBookApi()
        .get(ADDRESSES_PATH)
        .query({ page: '1', q: 'France', countryCode: 'FR' })
        .reply(200, pageOf([]))

      await addressBook.listAddresses(ORG_ID, {
        page: 1,
        q: 'France',
        countryCode: 'FR'
      })

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('#createAddress', () => {
    test('Should POST the address with the organisation header and return the created record', async () => {
      const scope = addressBookApi()
        .post(ADDRESSES_PATH, highland)
        .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
        .reply(201, { id: ADDRESS_ID, ...highland })

      const result = await addressBook.createAddress(ORG_ID, highland)

      expect(result.id).toBe(ADDRESS_ID)
      expect(scope.isDone()).toBe(true)
    })

    test('Should raise the validation problem with its status and field errors on a 400', async () => {
      addressBookApi().post(ADDRESSES_PATH).reply(400, validationProblem)

      await expect(
        addressBook.createAddress(ORG_ID, { ...highland, email: 'bad' })
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
        .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
        .matchHeader(TRACING_HEADER, TRACE_ID)
        .reply(200, { id: ADDRESS_ID, ...highland, deleted: false })

      const result = await addressBook.getAddress(ORG_ID, ADDRESS_ID)

      expect(result.name).toBe('Highland Livestock Ltd')
      expect(result.deleted).toBe(false)
      expect(scope.isDone()).toBe(true)
    })

    test('Should encode the organisation and address ids in the path', async () => {
      const orgWithSpecialChars = 'org/id'
      const scope = addressBookApi()
        .get(
          `/organisation/${encodeURIComponent(orgWithSpecialChars)}/addresses/${encodeURIComponent(ADDRESS_ID)}`
        )
        .matchHeader(ORGANISATION_ID_HEADER, orgWithSpecialChars)
        .reply(200, { id: ADDRESS_ID, name: 'Farm', deleted: false })

      await addressBook.getAddress(orgWithSpecialChars, ADDRESS_ID)

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('#updateAddress', () => {
    test('Should PUT the address with the organisation header and return the updated record', async () => {
      const scope = addressBookApi()
        .put(ADDRESS_PATH, highland)
        .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
        .reply(200, { id: ADDRESS_ID, ...highland })

      const result = await addressBook.updateAddress(
        ORG_ID,
        ADDRESS_ID,
        highland
      )

      expect(result.id).toBe(ADDRESS_ID)
      expect(scope.isDone()).toBe(true)
    })

    test('Should raise the validation problem with its status and field errors on a 400', async () => {
      addressBookApi().put(ADDRESS_PATH).reply(400, validationProblem)

      await expect(
        addressBook.updateAddress(ORG_ID, ADDRESS_ID, {
          ...highland,
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
        .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
        .reply(204)

      await addressBook.deleteAddress(ORG_ID, ADDRESS_ID)

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('on a failure', () => {
    test('Should surface the API message and status when the body has no detail', async () => {
      addressBookApi().get(ADDRESSES_PATH).query({ page: '1' }).reply(404, {
        message: 'No static resource organisation/5900001/addresses.'
      })

      await expect(addressBook.listAddresses(ORG_ID)).rejects.toMatchObject({
        message: 'No static resource organisation/5900001/addresses.',
        status: 404
      })
    })
  })

  describe('without an organisation', () => {
    test('Should refuse to reach the address book rather than ask for an organisation named "undefined"', async () => {
      // No interceptor is defined and net connect is refused, so a request
      // would reject with nock's own error, not the message matched here.
      const refusal = /without an organisation/

      await expect(addressBook.listAddresses(undefined)).rejects.toThrow(
        refusal
      )
      await expect(
        addressBook.createAddress(undefined, highland)
      ).rejects.toThrow(refusal)
      await expect(
        addressBook.getAddress(undefined, ADDRESS_ID)
      ).rejects.toThrow(refusal)
      await expect(
        addressBook.updateAddress(undefined, ADDRESS_ID, highland)
      ).rejects.toThrow(refusal)
      await expect(
        addressBook.deleteAddress(undefined, ADDRESS_ID)
      ).rejects.toThrow(refusal)
    })
  })
})

describe('#mapApiErrorsToFormErrors', () => {
  test('Should map the problem errors to an error summary and per-field messages', () => {
    const result = addressBook.mapApiErrorsToFormErrors({
      errors: {
        addressLine1: ['Enter address line 1'],
        email: ['Enter an email address in the correct format']
      }
    })

    expect(result.errorList).toEqual([
      { text: 'Enter address line 1', href: '#addressLine1' },
      {
        text: 'Enter an email address in the correct format',
        href: '#email'
      }
    ])
    expect(result.fieldErrors.email.text).toBe(
      'Enter an email address in the correct format'
    )
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

  test('Should seed one address for an ordinary organisation, at the id the fit specs address', async () => {
    const { items, totalItems } = await addressBook.listAddresses('stub-org-1')

    expect(totalItems).toBe(1)
    expect(items[0]).toMatchObject({
      id: '000000000000000000000001',
      name: 'Stub Farm 1',
      countryCode: 'GB'
    })
  })

  test('Should seed nothing for an organisation ending in -empty', async () => {
    const { items, totalItems } =
      await addressBook.listAddresses('stub-org-empty')

    expect(totalItems).toBe(0)
    expect(items).toEqual([])
  })

  test('Should seed thirty addresses over two pages for an organisation ending in -paginated', async () => {
    const first = await addressBook.listAddresses('stub-org-paginated', {
      page: 1
    })
    const second = await addressBook.listAddresses('stub-org-paginated', {
      page: 2
    })

    expect(first).toMatchObject({ totalItems: 30, totalPages: 2, page: 1 })
    expect(first.items).toHaveLength(25)
    expect(second.items).toHaveLength(5)
  })

  test('Should round-trip an address through create, update and delete', async () => {
    const org = 'stub-org-round-trip'

    const created = await addressBook.createAddress(org, highland)
    expect(created.id).toMatch(/^[0-9a-f]{24}$/)
    expect(await addressBook.getAddress(org, created.id)).toMatchObject(
      highland
    )

    const updated = await addressBook.updateAddress(org, created.id, {
      name: 'Updated Farm Ltd'
    })
    expect(updated).toMatchObject({
      id: created.id,
      name: 'Updated Farm Ltd',
      postcode: 'IV2 3JH'
    })

    await addressBook.deleteAddress(org, created.id)
    await expect(addressBook.getAddress(org, created.id)).rejects.toMatchObject(
      { status: 404 }
    )
  })
})
