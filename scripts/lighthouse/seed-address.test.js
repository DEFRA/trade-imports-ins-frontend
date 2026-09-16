import nock from 'nock'
import { describe, expect, test } from 'vitest'

import {
  addressRules,
  FIELDS
} from '../../src/server/app/features/address-book/fields.js'
import { validate } from '../../src/server/app/lib/validate/index.js'
import { refuseOutboundHttp } from '../../src/server/common/test-helpers/real-mode.js'
import { createPageClient } from './page-client.js'
import {
  addressIdIn,
  findSeedAddressId,
  SEED_ADDRESS,
  seedAddress
} from './seed-address.js'

const ORIGIN = 'http://localhost:3002'
const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'
const STUB_ADDRESS_ID = '000000000000000000000001'
const CRUMB = 'crumb-token'
const CRUMB_COOKIE = 'crumb=cookie-crumb; Path=/'
const SEARCH = { q: SEED_ADDRESS.name }
const HTTP_OK = 200
const HTTP_FOUND = 302
const HTTP_BAD_REQUEST = 400

const page = (body) =>
  `<html><head><meta name="csrf-token" content="${CRUMB}"></head><body><h1>Page</h1>${body}</body></html>`

const viewLink = (id, name) =>
  `<a class="govuk-link" href="/address-book/${id}">View<span class="govuk-visually-hidden"> ${name}</span></a>`

const listPage = (...links) =>
  page(
    `<table class="govuk-table"><tbody>${links
      .map((link) => `<tr><td>${link}</td></tr>`)
      .join('')}</tbody></table>`
  )

const app = () => nock(ORIGIN)

const listing = (...links) =>
  app()
    .get('/address-book')
    .query(SEARCH)
    .reply(HTTP_OK, listPage(...links))

describe('#SEED_ADDRESS', () => {
  test('Should send exactly the fields the add form asks, in the order it asks them', () => {
    expect(Object.keys(SEED_ADDRESS)).toEqual(FIELDS)
  })

  test('Should fill every field, the optional ones included', () => {
    for (const field of FIELDS) {
      expect(SEED_ADDRESS[field], field).not.toBe('')
    }
  })

  test("Should pass the add form's own rules", () => {
    expect(
      validate(addressRules([SEED_ADDRESS.countryCode]), SEED_ADDRESS).errors
    ).toBeNull()
  })
})

describe('#addressIdIn', () => {
  test('Should read the id from the view link of a row', () => {
    expect(addressIdIn(`/address-book/${ADDRESS_ID}`)).toBe(ADDRESS_ID)
  })
})

describe('#seedAddress', () => {
  refuseOutboundHttp()

  test('Should reuse the seed address an earlier run created', async () => {
    const scope = listing(viewLink(ADDRESS_ID, SEED_ADDRESS.name))

    await expect(seedAddress(createPageClient(ORIGIN))).resolves.toBe(
      ADDRESS_ID
    )
    expect(scope.isDone()).toBe(true)
  })

  test('Should match the seed by name and not trust the search, as the stub lists every row', async () => {
    listing(
      viewLink(STUB_ADDRESS_ID, 'Stub Farm 1'),
      viewLink(ADDRESS_ID, SEED_ADDRESS.name)
    )

    await expect(findSeedAddressId(createPageClient(ORIGIN))).resolves.toBe(
      ADDRESS_ID
    )
  })

  test('Should create the seed address through the add page when the book lists none, posting the crumb the page issued', async () => {
    listing(viewLink(STUB_ADDRESS_ID, 'Stub Farm 1'))
    const created = app()
      .get('/address-book/add')
      .reply(HTTP_OK, page('<form></form>'), { 'set-cookie': [CRUMB_COOKIE] })
      .post('/address-book/add', { crumb: CRUMB, ...SEED_ADDRESS })
      .matchHeader('cookie', /crumb=cookie-crumb/)
      .reply(HTTP_FOUND, '', { location: '/address-book' })
    listing(
      viewLink(STUB_ADDRESS_ID, 'Stub Farm 1'),
      viewLink(ADDRESS_ID, SEED_ADDRESS.name)
    )

    await expect(seedAddress(createPageClient(ORIGIN))).resolves.toBe(
      ADDRESS_ID
    )
    expect(created.isDone()).toBe(true)
  })

  test('Should refuse when the add page rejects the seed', async () => {
    listing()
    app()
      .get('/address-book/add')
      .reply(HTTP_OK, page('<form></form>'))
      .post('/address-book/add')
      .reply(
        HTTP_BAD_REQUEST,
        page('<div role="alert">There is a problem</div>')
      )

    await expect(seedAddress(createPageClient(ORIGIN))).rejects.toThrow(
      /rejected the seed address \(400\)/
    )
  })

  test('Should refuse when the address book does not list the address it just accepted', async () => {
    listing()
    app()
      .get('/address-book/add')
      .reply(HTTP_OK, page('<form></form>'))
      .post('/address-book/add')
      .reply(HTTP_FOUND, '', { location: '/address-book' })
    listing()

    await expect(seedAddress(createPageClient(ORIGIN))).rejects.toThrow(
      /does not list the seed address it just accepted/
    )
  })
})
