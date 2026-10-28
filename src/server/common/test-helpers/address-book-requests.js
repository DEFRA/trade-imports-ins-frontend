import { expect } from 'vitest'

import { statusCodes } from '../constants/status-codes.js'
import { addressBookApi } from './real-mode.js'
import { ORGANISATION_ID, sessionAuth } from './session-auth.js'

export const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'

export const MALFORMED_ADDRESS_ID = 'not-a-valid-id'

export const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

export const OTHER_ORGANISATION_ID = '0c4e7a92-3b1d-4f58-a6e2-9d8b5c1f7a34'

export const ADDRESS_BOOK_PATH = '/address-book'

export const ADD_ADDRESS_PATH = `${ADDRESS_BOOK_PATH}/add`

export const RETURN_HOME = '?return=%2F'

export const addressPagePath = (addressId) =>
  `${ADDRESS_BOOK_PATH}/${addressId}`

export const editAddressPagePath = (addressId) =>
  `${addressPagePath(addressId)}/edit`

export const deleteAddressPagePath = (addressId) =>
  `${addressPagePath(addressId)}/delete`

export const addressesApiPath = (organisationId = ORGANISATION_ID) =>
  `/organisation/${organisationId}/addresses`

export const addressApiPath = (addressId, organisationId = ORGANISATION_ID) =>
  `${addressesApiPath(organisationId)}/${addressId}`

export const BACK_LINK = 'a.govuk-back-link'

export const COUNTRY_OPTIONS = '#countryCode option'

export const SELECTED_COUNTRY = '#countryCode option[selected]'

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
  deleted: false
}

export const VALID_ADDRESS_PAYLOAD = {
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

export const INVALID_ADDRESS_PAYLOAD = {
  name: '',
  addressLine1: '',
  townOrCity: '',
  postcode: '',
  countryCode: '',
  phone: '',
  email: 'bad'
}

export const pageOf = (items, overrides = {}) => ({
  items,
  page: 1,
  pageSize: 25,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
  ...overrides
})

export const getPage = (server, url, sessionId) =>
  server.inject({ method: 'GET', url, auth: sessionAuth(sessionId) })

export const postPage = (server, url, sessionId, payload) =>
  server.inject({ method: 'POST', url, auth: sessionAuth(sessionId), payload })

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

export const expectRedirectTo = ({ statusCode, headers }, location) => {
  expect(statusCode).toBe(statusCodes.redirectFound)
  expect(headers.location).toBe(location)
}

export const expectServerErrorPage = ({ statusCode, result }) => {
  expect(statusCode).toBe(statusCodes.internalServerError)
  expect(result).toContain('Something went wrong')
}
