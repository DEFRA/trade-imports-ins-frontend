import Boom from '@hapi/boom'

import { getAddress } from '../../services/address-book/index.js'
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import { countryLabelOf, getAddressFormCountries } from './address-countries.js'

export const isNotFound = (err) => err.status === HTTP_STATUS_NOT_FOUND

/** Reads an address, treating anything that is not a live address in this book as absent. */
export const findLiveAddress = async (organisationId, addressId) => {
  try {
    const address = await getAddress(organisationId, addressId)
    return address.deleted ? undefined : address
  } catch (err) {
    if (isNotFound(err)) {
      return undefined
    }
    throw err
  }
}

export const findLiveAddressWithCountryLabel = async (
  organisationId,
  addressId
) => {
  const address = await findLiveAddress(organisationId, addressId)
  if (!address) {
    return undefined
  }
  const countries = await getAddressFormCountries()
  return {
    address,
    countryLabel: countryLabelOf(countries, address.countryCode)
  }
}

export const loadStoredAddress = async (organisationId, addressId) => {
  const address = await findLiveAddress(organisationId, addressId)
  if (!address) {
    throw Boom.notFound()
  }
  return address
}

export const boomFor = (err, logUnexpected) => {
  if (err.isBoom) {
    return err
  }
  if (isNotFound(err)) {
    return Boom.notFound()
  }
  logUnexpected()
  return Boom.internal()
}
