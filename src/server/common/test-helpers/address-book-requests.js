import { expect } from 'vitest'

import { ADDRESS_TYPES } from '../../app/services/address-book/index.js'
import { addressTypePath } from '../../app/shared/paths.js'
import { statusCodes } from '../constants/status-codes.js'
import { addressBookApi } from './real-mode.js'
import { ORGANISATION_ID, sessionAuth } from './session-auth.js'

export const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'

export const MALFORMED_ADDRESS_ID = 'not-a-valid-id'

export const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

export const OTHER_ORGANISATION_ID = '0c4e7a92-3b1d-4f58-a6e2-9d8b5c1f7a34'

export {
  addressAddPath,
  addressBookPath,
  addressDeletePath,
  addressEditPath,
  addressPath,
  addressTypePath,
  addressTypeStartPath
} from '../../app/shared/paths.js'

export const addressesApiPath = (organisationId = ORGANISATION_ID) =>
  `/organisation/${organisationId}/addresses`

export const addressApiPath = (addressId, organisationId = ORGANISATION_ID) =>
  `${addressesApiPath(organisationId)}/${addressId}`

export const BACK_LINK = 'a.govuk-back-link'

export const COUNTRY_OPTIONS = '#countryCode option'

export const SELECTED_COUNTRY_OPTION = '#countryCode option[selected]'

export const ADDRESS_FORM_LABELS = [
  'Name or organisation',
  'Address line 1',
  'Address line 2 (optional)',
  'Town or city',
  'County (optional)',
  'Postcode or Zip code',
  'Country',
  'Email address',
  'Phone number'
]

export const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'DE', name: 'Germany' }
]

export const STORED_ADDRESS = {
  id: ADDRESS_ID,
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  addressLine2: 'Unit 2',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com',
  roles: ['PLACE_OF_ORIGIN', 'CONSIGNOR'],
  deleted: false
}

export const VALID_ADDRESS_FIELDS = {
  name: STORED_ADDRESS.name,
  addressLine1: STORED_ADDRESS.addressLine1,
  addressLine2: '',
  townOrCity: STORED_ADDRESS.townOrCity,
  county: '',
  postcode: STORED_ADDRESS.postcode,
  countryCode: STORED_ADDRESS.countryCode,
  phone: STORED_ADDRESS.phone,
  email: STORED_ADDRESS.email
}

export const VALID_ADDRESS_RECORD = {
  ...VALID_ADDRESS_FIELDS,
  roles: STORED_ADDRESS.roles
}

export const VALID_ADDRESS_PAYLOAD = {
  ...VALID_ADDRESS_FIELDS,
  roles: 'PLACE_OF_ORIGIN'
}

export const INVALID_ADDRESS_PAYLOAD = {
  name: '',
  addressLine1: '',
  townOrCity: '',
  postcode: '',
  countryCode: '',
  phone: '',
  email: 'bad'
}

const carriesRoles = (body) =>
  body.roles?.length > 0 && !Object.hasOwn(body, 'addressType')

export const serveAddressCreated = (matchBody = carriesRoles) =>
  addressBookApi()
    .post(addressesApiPath(), matchBody)
    .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
    .reply(statusCodes.created, { id: ADDRESS_ID, name: STORED_ADDRESS.name })

export const serveAddressCreationCapturingBody = () => {
  const captured = {}
  const scope = serveAddressCreated((body) => {
    captured.body = body
    return true
  })
  return { scope, captured }
}

export const pageOf = (items, overrides = {}) => ({
  items,
  page: 1,
  pageSize: 25,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
  ...overrides
})

const headersWithCookie = (cookie) => (cookie ? { cookie } : {})

export const cookieHeaderOf = (headers) =>
  [headers['set-cookie']]
    .flat()
    .filter(Boolean)
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

export const getPage = (server, url, sessionId, cookie) =>
  server.inject({
    method: 'GET',
    url,
    auth: sessionAuth(sessionId),
    headers: headersWithCookie(cookie)
  })

export const postPage = (server, url, sessionId, payload, cookie) =>
  server.inject({
    method: 'POST',
    url,
    auth: sessionAuth(sessionId),
    payload,
    headers: headersWithCookie(cookie)
  })

export const cookieAfterChoosingAddressType = async (
  server,
  sessionId,
  { addressType = ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR, cookie } = {}
) => {
  const { headers } = await postPage(
    server,
    addressTypePath(),
    sessionId,
    { addressType },
    cookie
  )
  return cookieHeaderOf(headers) || cookie
}

export const getPageAsOtherOrganisation = (server, url, sessionId) =>
  server.inject({
    method: 'GET',
    url,
    auth: sessionAuth(sessionId, { organisationId: OTHER_ORGANISATION_ID })
  })

export const serveStoredAddress = (address = STORED_ADDRESS) =>
  addressBookApi()
    .get(addressApiPath(address.id))
    .reply(statusCodes.ok, address)

export const serveAddressNotFound = (addressId) =>
  addressBookApi()
    .get(addressApiPath(addressId))
    .reply(statusCodes.notFound, { message: 'Not found' })

export const serveAddressBookServerError = (path) =>
  addressBookApi()
    .get(path)
    .reply(statusCodes.serviceUnavailable, { title: 'Service Unavailable' })

export const serveAddressNotFoundForOtherOrganisation = (addressId) =>
  addressBookApi()
    .get(addressApiPath(addressId, OTHER_ORGANISATION_ID))
    .matchHeader(ORGANISATION_ID_HEADER, OTHER_ORGANISATION_ID)
    .reply(statusCodes.notFound, { message: 'Not found' })

export const interceptAddressBookRequest = (method, path) => {
  const scope = addressBookApi()
    .intercept(path, method)
    .reply(statusCodes.ok, STORED_ADDRESS)
  return {
    expectNotSent: () =>
      expect(scope.isDone(), `${method} ${path} reached the address book`).toBe(
        false
      )
  }
}

export const expectRedirectTo = ({ statusCode, headers }, location) => {
  expect(statusCode).toBe(statusCodes.redirectFound)
  expect(headers.location).toBe(location)
}

export const expectServerErrorPage = ({ statusCode, result }) => {
  expect(statusCode).toBe(statusCodes.internalServerError)
  expect(result).toContain('Something went wrong')
}
