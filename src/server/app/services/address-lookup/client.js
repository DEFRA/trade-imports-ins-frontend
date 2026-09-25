import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'
import { throwOnError } from '../../lib/http-client.js'

const insBackendUrl = config.get('tradeImportsInsBackendApi.baseUrl')
const tracingHeader = config.get('tracing.header')
const LOOKUP_PATH = '/address-lookup'

const headers = () => ({
  'Content-Type': 'application/json',
  [tracingHeader]: getTraceId() ?? ''
})

const get = async (search) => {
  const url = new URL(`${insBackendUrl}${LOOKUP_PATH}`)
  Object.entries(search).forEach(([key, value]) =>
    url.searchParams.set(key, value)
  )
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers()
  })
  await throwOnError(response)
  return response.json()
}

export const lookupDefaultPostcode = () => get({})
export const lookupByPostcode = (postcode) => get({ postcode })
export const lookupByFind = (find) => get({ find })
