import {
  addressBookHeaders,
  addressBookResourceUrl,
  throwOnAddressBookError
} from '../address-book-request.js'
import { throwOnError } from '../../lib/http-client.js'

const RESOURCE = 'transporters'

const transportersUrl = (organisationId) =>
  addressBookResourceUrl(RESOURCE, organisationId)

export const listTransporters = async (
  organisationId,
  {
    page = 1,
    pageSize,
    searchTerm,
    countryCodes = [],
    types = [],
    searchTypes = []
  } = {}
) => {
  const url = new URL(transportersUrl(organisationId))
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))
  for (const type of types) {
    url.searchParams.append('type', type)
  }
  if (searchTerm) {
    url.searchParams.set('q', searchTerm)
  }
  for (const countryCode of countryCodes) {
    url.searchParams.append('countryCode', countryCode)
  }
  for (const searchType of searchTypes) {
    url.searchParams.append('searchType', searchType)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: addressBookHeaders(organisationId)
  })

  await throwOnError(response)
  return response.json()
}

export const createTransporter = async (organisationId, transporter) => {
  const response = await fetch(transportersUrl(organisationId), {
    method: 'POST',
    headers: addressBookHeaders(organisationId),
    body: JSON.stringify(transporter)
  })

  await throwOnAddressBookError(response)
  return response.json()
}
