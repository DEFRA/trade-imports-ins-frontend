import { config } from '#/config/config.js'

const insBackendBaseUrl = config.get('tradeImportsInsBackendApi.baseUrl')
const tracingHeader = config.get('tracing.header')

function buildHeaders(traceId) {
  return {
    'Content-Type': 'application/json',
    [tracingHeader]: traceId ?? ''
  }
}

async function parseProblemBody(response) {
  return response.json().catch(() => ({}))
}

function errorMessageFromBody(body, response) {
  return (
    body.detail ||
    body.message ||
    body.title ||
    response.statusText ||
    `HTTP ${response.status}`
  )
}

async function throwOnError(response) {
  if (response.ok) {
    return response
  }

  const body = await parseProblemBody(response)
  const error = new Error(errorMessageFromBody(body, response))
  error.status = response.status
  error.statusText = response.statusText
  error.body = body
  throw error
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
