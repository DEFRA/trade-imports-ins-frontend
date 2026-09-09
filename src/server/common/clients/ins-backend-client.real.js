import { config } from '#/config/config.js'
import { throwOnError } from './http-client.js'

const insBackendBaseUrl = config.get('tradeImportsInsBackendApi.baseUrl')
const tracingHeader = config.get('tracing.header')

function buildHeaders(traceId) {
  return {
    'Content-Type': 'application/json',
    [tracingHeader]: traceId ?? ''
  }
}

// Deliberately unscoped — no organisation header. The dashboard lists every
// notification in the aggregated store until a later ticket persists
// organisationId on a notification and can filter here.
export const insBackendClient = {
  async listNotifications(traceId, { page = 1, sort, referenceNumber } = {}) {
    const url = new URL(`${insBackendBaseUrl}/notifications`)
    url.searchParams.set('page', String(page))
    if (sort) {
      url.searchParams.set('sort', sort)
    }
    if (referenceNumber) {
      url.searchParams.set('referenceNumber', referenceNumber)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(traceId)
    })

    await throwOnError(response)
    return response.json()
  }
}
