import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'
import { throwOnError } from '../../lib/http-client.js'

const insBackendUrl = config.get('tradeImportsInsBackendApi.baseUrl')
const tracingHeader = config.get('tracing.header')

const headers = () => ({
  'Content-Type': 'application/json',
  [tracingHeader]: getTraceId() ?? ''
})

// Deliberately unscoped — no organisation header. The dashboard lists every
// notification in the aggregated store until a later ticket persists
// organisationId on a notification and can filter here.
export const listNotifications = async ({
  page = 1,
  sort,
  referenceNumber
} = {}) => {
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
    headers: headers()
  })

  await throwOnError(response)
  return response.json()
}
