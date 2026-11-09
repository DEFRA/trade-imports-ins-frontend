import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../config/config.js'
import { HTTP_STATUS_BAD_REQUEST } from '../lib/http-status.js'
import { parseProblemBody, throwOnError } from '../lib/http-client.js'

const addressBookUrl = config.get('tradeImportsAddressBookApi.baseUrl')
const tracingHeader = config.get('tracing.header')
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

/**
 * The absolute URL of a resource under the caller's organisation in the
 * address book, or one record of it.
 *
 * @param {string} resource the resource's path segment (e.g. 'addresses')
 * @param {string} organisationId the caller's organisation id
 * @param {string} [resourceId] the record's id, or undefined for the collection
 * @returns {string} the resource's URL
 * @throws {Error} if organisationId is missing
 */
export const addressBookResourceUrl = (
  resource,
  organisationId,
  resourceId
) => {
  if (!organisationId) {
    throw new Error(
      'Cannot reach the address book without an organisation: the signed-in session carries none'
    )
  }
  const base = `${addressBookUrl}/organisation/${encodeURIComponent(organisationId)}/${resource}`
  return resourceId ? `${base}/${encodeURIComponent(resourceId)}` : base
}

/**
 * The headers every address-book request carries.
 *
 * @param {string} organisationId the caller's organisation id
 * @returns {Record<string, string>} the request headers
 */
export const addressBookHeaders = (organisationId) => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: organisationId,
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

/**
 * Raises a 400 from the address book as a validation failure carrying the
 * problem body, and every other non-ok response as the generic backend error.
 *
 * @param {Response} response
 * @throws {Error} when the response is not ok
 */
export const throwOnAddressBookError = async (response) => {
  if (response.status === HTTP_STATUS_BAD_REQUEST) {
    throw await validationFailure(response)
  }
  return throwOnError(response)
}
