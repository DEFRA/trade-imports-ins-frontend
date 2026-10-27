import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import { parseProblemBody, throwOnError } from '../../lib/http-client.js'

const addressBookUrl = config.get('tradeImportsAddressBookApi.baseUrl')
const tracingHeader = config.get('tracing.header')

const addressesUrl = (organisationId, addressId) => {
  if (!organisationId) {
    throw new Error(
      'Cannot reach the address book without an organisation: the signed-in session carries none'
    )
  }
  const base = `${addressBookUrl}/organisation/${encodeURIComponent(organisationId)}/addresses`
  return addressId ? `${base}/${encodeURIComponent(addressId)}` : base
}

const headers = (organisationId) => {
  const organisationIdHeader = 'Trade-Imports-Organisation-Id'
  return {
    'Content-Type': 'application/json',
    [organisationIdHeader]: organisationId,
    [tracingHeader]: getTraceId() ?? ''
  }
}

const validationFailure = async (response) => {
  const problem = await parseProblemBody(response)
  return Object.assign(new Error(problem.detail || 'Validation failed'), {
    status: HTTP_STATUS_BAD_REQUEST,
    statusText: response.statusText,
    body: problem
  })
}

const throwOnErrorWithValidationDetail = async (response) => {
  if (response.status === HTTP_STATUS_BAD_REQUEST) {
    throw await validationFailure(response)
  }
  return throwOnError(response)
}

export const listAddresses = async (
  organisationId,
  { page = 1, pageSize, searchTerm, countryCodes = [] } = {}
) => {
  const url = new URL(addressesUrl(organisationId))
  url.searchParams.set('page', String(page))
  if (pageSize) {
    url.searchParams.set('pageSize', String(pageSize))
  }
  if (searchTerm) {
    url.searchParams.set('q', searchTerm)
  }
  for (const countryCode of countryCodes) {
    url.searchParams.append('countryCode', countryCode)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(organisationId)
  })

  await throwOnError(response)
  return response.json()
}

export const createAddress = async (organisationId, address) => {
  const response = await fetch(addressesUrl(organisationId), {
    method: 'POST',
    headers: headers(organisationId),
    body: JSON.stringify(address)
  })

  await throwOnErrorWithValidationDetail(response)
  return response.json()
}

export const getAddress = async (organisationId, addressId) => {
  const response = await fetch(addressesUrl(organisationId, addressId), {
    method: 'GET',
    headers: headers(organisationId)
  })

  await throwOnError(response)
  return response.json()
}

export const updateAddress = async (organisationId, addressId, address) => {
  const response = await fetch(addressesUrl(organisationId, addressId), {
    method: 'PUT',
    headers: headers(organisationId),
    body: JSON.stringify(address)
  })

  await throwOnErrorWithValidationDetail(response)
  return response.json()
}

export const deleteAddress = async (organisationId, addressId) => {
  const response = await fetch(addressesUrl(organisationId, addressId), {
    method: 'DELETE',
    headers: headers(organisationId)
  })

  await throwOnError(response)
}
