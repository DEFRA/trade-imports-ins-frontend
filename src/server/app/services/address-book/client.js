import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import { parseProblemBody, throwOnError } from '../../lib/http-client.js'

const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const addressBookUrl = config.get('tradeImportsAddressBookApi.baseUrl')
const tracingHeader = config.get('tracing.header')

/** The organisation is part of the path, so a missing one does not fail — it
 * asks for an organisation literally named "undefined", which the address book
 * answers truthfully with an empty book. That reads as "this organisation has
 * saved no addresses", or on a resolve as "this address was deleted", when what
 * actually happened is that nobody was signed in. Refuse instead: a read with
 * no organisation is a bug in the caller, and it should say so. */
const addressesUrl = (orgId, addressId) => {
  if (!orgId) {
    throw new Error(
      'Cannot reach the address book without an organisation: the signed-in session carries none'
    )
  }
  const base = `${addressBookUrl}/organisation/${encodeURIComponent(orgId)}/addresses`
  return addressId ? `${base}/${encodeURIComponent(addressId)}` : base
}

/** The organisation is the authorisation — the address book runs no in-service
 * authentication and trusts this header (see its IdentityHeaderFilter). It must
 * always come from the authenticated session, never a payload or a stored
 * field, and it must match the orgId in the path (cv-010). */
const headers = (orgId) => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: orgId,
  [tracingHeader]: getTraceId() ?? ''
})

const validationFailure = async (response) => {
  const problem = await parseProblemBody(response)
  return Object.assign(new Error(problem.detail || 'Validation failed'), {
    status: HTTP_STATUS_BAD_REQUEST,
    statusText: response.statusText,
    body: problem
  })
}

const throwOnValidationFailure = async (response) => {
  if (response.status === HTTP_STATUS_BAD_REQUEST) {
    throw await validationFailure(response)
  }
  return throwOnError(response)
}

export const listAddresses = async (
  orgId,
  { page = 1, q, countryCode } = {}
) => {
  const url = new URL(addressesUrl(orgId))
  url.searchParams.set('page', String(page))
  if (q) {
    url.searchParams.set('q', q)
  }
  if (countryCode) {
    url.searchParams.set('countryCode', countryCode)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(orgId)
  })

  await throwOnError(response)
  return response.json()
}

export const createAddress = async (orgId, body) => {
  const response = await fetch(addressesUrl(orgId), {
    method: 'POST',
    headers: headers(orgId),
    body: JSON.stringify(body)
  })

  await throwOnValidationFailure(response)
  return response.json()
}

export const getAddress = async (orgId, id) => {
  const response = await fetch(addressesUrl(orgId, id), {
    method: 'GET',
    headers: headers(orgId)
  })

  await throwOnError(response)
  return response.json()
}

export const updateAddress = async (orgId, id, body) => {
  const response = await fetch(addressesUrl(orgId, id), {
    method: 'PUT',
    headers: headers(orgId),
    body: JSON.stringify(body)
  })

  await throwOnValidationFailure(response)
  return response.json()
}

export const deleteAddress = async (orgId, id) => {
  const response = await fetch(addressesUrl(orgId, id), {
    method: 'DELETE',
    headers: headers(orgId)
  })

  await throwOnError(response)
}
