import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'
import { throwOnError } from '../../lib/http-client.js'

const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const insBackendUrl = config.get('tradeImportsInsBackendApi.baseUrl')
const tracingHeader = config.get('tracing.header')

const headers = (organisationId) => {
  if (!organisationId) {
    throw new Error(
      'Cannot reach the notification list without an organisation: the signed-in session carries none'
    )
  }
  return {
    'Content-Type': 'application/json',
    [ORGANISATION_ID_HEADER]: organisationId,
    [tracingHeader]: getTraceId() ?? ''
  }
}

export const listNotifications = async (
  organisationId,
  { page = 1, sort, referenceNumber } = {}
) => {
  const url = new URL(`${insBackendUrl}/notifications`)
  url.searchParams.set('page', String(page))
  if (sort) {
    url.searchParams.set('sort', sort)
  }
  if (referenceNumber) {
    url.searchParams.set('referenceNumber', referenceNumber)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(organisationId)
  })

  await throwOnError(response)
  return response.json()
}
