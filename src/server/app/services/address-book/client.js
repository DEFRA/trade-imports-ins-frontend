import { throwOnError } from '../../lib/http-client.js'
import {
  addressBookHeaders,
  addressBookResourceUrl,
  throwOnAddressBookError
} from '../address-book-request.js'

const RESOURCE = 'addresses'

const addressesUrl = (organisationId, addressId) =>
  addressBookResourceUrl(RESOURCE, organisationId, addressId)

export const listAddresses = async (
  organisationId,
  {
    page = 1,
    pageSize,
    searchTerm,
    countryCodes = [],
    roles = [],
    searchRoles = []
  } = {}
) => {
  const url = new URL(addressesUrl(organisationId))
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(pageSize))
  for (const role of roles) {
    url.searchParams.append('role', role)
  }
  if (searchTerm) {
    url.searchParams.set('q', searchTerm)
  }
  for (const countryCode of countryCodes) {
    url.searchParams.append('countryCode', countryCode)
  }
  for (const searchRole of searchRoles) {
    url.searchParams.append('searchRole', searchRole)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: addressBookHeaders(organisationId)
  })

  await throwOnError(response)
  return response.json()
}

export const createAddress = async (organisationId, address) => {
  const response = await fetch(addressesUrl(organisationId), {
    method: 'POST',
    headers: addressBookHeaders(organisationId),
    body: JSON.stringify(address)
  })

  await throwOnAddressBookError(response)
  return response.json()
}

export const getAddress = async (organisationId, addressId) => {
  const response = await fetch(addressesUrl(organisationId, addressId), {
    method: 'GET',
    headers: addressBookHeaders(organisationId)
  })

  await throwOnError(response)
  return response.json()
}

export const updateAddress = async (organisationId, addressId, address) => {
  const response = await fetch(addressesUrl(organisationId, addressId), {
    method: 'PUT',
    headers: addressBookHeaders(organisationId),
    body: JSON.stringify(address)
  })

  await throwOnAddressBookError(response)
  return response.json()
}

export const deleteAddress = async (organisationId, addressId) => {
  const response = await fetch(addressesUrl(organisationId, addressId), {
    method: 'DELETE',
    headers: addressBookHeaders(organisationId)
  })

  await throwOnError(response)
}
