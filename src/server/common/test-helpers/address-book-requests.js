import { expect } from 'vitest'

import { statusCodes } from '../constants/status-codes.js'
import { addressBookApi } from './real-mode.js'
import { ORGANISATION_ID, sessionAuth } from './session-auth.js'

export const MALFORMED_ADDRESS_ID = 'not-a-valid-id'

export const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

export const OTHER_ORGANISATION_ID = '0c4e7a92-3b1d-4f58-a6e2-9d8b5c1f7a34'

export const addressesApiPath = (organisationId = ORGANISATION_ID) =>
  `/organisation/${organisationId}/addresses`

export const addressApiPath = (addressId, organisationId = ORGANISATION_ID) =>
  `${addressesApiPath(organisationId)}/${addressId}`

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
