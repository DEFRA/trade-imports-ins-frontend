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

async function get(path, traceId) {
  const response = await fetch(`${insBackendBaseUrl}${path}`, {
    method: 'GET',
    headers: buildHeaders(traceId)
  })

  await throwOnError(response)
  return response.json()
}

/**
 * EUDPA-390 spike client for `GET /address-lookup` on trade-imports-ins-backend. The
 * backend's response is always 200; a failed lookup is an `outcome`, not an HTTP error (plan,
 * "The backend → frontend contract"), so this only throws on a genuine transport failure or the
 * backend itself being unreachable.
 */
export const addressLookupClient = {
  async lookupDefaultPostcode(traceId) {
    return get('/address-lookup', traceId)
  },

  async lookupByPostcode(postcode, traceId) {
    return get(`/address-lookup?postcode=${encodeURIComponent(postcode)}`, traceId)
  },

  async lookupByFind(find, traceId) {
    return get(`/address-lookup?find=${encodeURIComponent(find)}`, traceId)
  }
}
