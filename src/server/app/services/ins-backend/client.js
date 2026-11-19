import { config } from '../../../../config/config.js'
import { organisationScopedHeaders } from '../../../common/helpers/organisation-scoped-headers.js'
import { throwOnError } from '../../lib/http-client.js'

const insBackendUrl = config.get('tradeImportsInsBackendApi.baseUrl')

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
    headers: organisationScopedHeaders(organisationId)
  })

  await throwOnError(response)
  return response.json()
}
