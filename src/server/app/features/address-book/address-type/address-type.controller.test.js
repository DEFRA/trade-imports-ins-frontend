import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '../../../../server.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../../../common/test-helpers/session-auth.js'
import {
  cookieOf,
  startAddAs
} from '../../../../common/test-helpers/add-in-progress.js'
import { runInRealMode } from '../../../../common/test-helpers/real-mode.js'
import { config } from '../../../../../config/config.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const TYPE_URL = '/address-book/add/address-type'
const ADD_URL = '/address-book/add'
const ERROR_TITLE =
  'Error: Choose an address type - Import notification service - GOV.UK'

describe('#addressTypeController', { concurrent: false }, () => {
  let server

  const getType = (session, { url = TYPE_URL, cookie } = {}) =>
    server.inject({
      method: 'GET',
      url,
      auth: sessionAuth(session),
      headers: cookie ? { cookie } : {}
    })

  const postType = (session, payload) =>
    server.inject({
      method: 'POST',
      url: TYPE_URL,
      auth: sessionAuth(session),
      payload
    })

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    config.set('csrf.enabled', false)
  })

  test('GET shows the caption, the heading, a visually hidden legend repeating it, the three types with their hints in order, Continue and a Back link to the address book', async () => {
    const { result, statusCode, headers } = await getType('type-get')

    expect(statusCode).toBe(statusCodes.ok)
    expect(headers['cache-control']).toBe('no-store')
    expect(result).toContain('<span class="govuk-caption-l">Add a new address')
    expect(result).toContain('Choose an address type</h1>')
    expect(result).toMatch(
      /<legend class="govuk-fieldset__legend govuk-visually-hidden">\s*Choose an address type\s*<\/legend>/
    )
    const positions = [
      'Origin or Consignor',
      'Place of origin, Consignor',
      'Destination, Consignee or Importer',
      'Place of destination, Consignee, Importer',
      'Branch',
      'Branch address'
    ].map((text) => result.indexOf(text))
    expect(positions.every((position) => position > -1)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(result).toContain('Continue')
    expect(result).toContain('href="/address-book"')
    expect(result).toContain('govuk-back-link')
    expect(result).not.toContain('Transporter')
    expect(result).not.toContain('checked')
  })

  test('POST with no type re-renders with Select an address type, linked to the first option', async () => {
    const { result, statusCode } = await postType('type-post-none', {})

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('There is a problem')
    expect(result).toContain('href="#addressType"')
    expect(result).toContain('Select an address type')
    expect(result).toContain('id="addressType"')
    expect(result).toContain(ERROR_TITLE)
  })

  test('POST with a type outside the three is refused the same way', async () => {
    const { result, statusCode } = await postType('type-post-other', {
      addressType: 'TRANSPORTER'
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('Select an address type')
    expect(result).toContain(ERROR_TITLE)
  })

  test('POST with a type remembers it and redirects to the address form', async () => {
    const response = await postType('type-post-branch', {
      addressType: 'BRANCH'
    })

    expect(response.statusCode).toBe(statusCodes.redirectFound)
    expect(response.headers.location).toBe(ADD_URL)

    const { result } = await getType('type-post-branch', {
      cookie: cookieOf(response)
    })
    expect(result).toContain('value="BRANCH" checked')
  })

  test('GET with start=new forgets the chosen type', async () => {
    const session = 'type-start-new'
    const cookie = await startAddAs(server, sessionAuth(session), 'BRANCH')

    const fresh = await getType(session, {
      url: `${TYPE_URL}?start=new`,
      cookie
    })
    expect(fresh.result).not.toContain('checked')

    const form = await getType(session, {
      url: ADD_URL,
      cookie: cookieOf(fresh)
    })
    expect(form.statusCode).toBe(statusCodes.redirectFound)
    expect(form.headers.location).toBe(TYPE_URL)
  })
})
