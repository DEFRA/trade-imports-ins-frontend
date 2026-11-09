import Boom from '@hapi/boom'

import { getAddress } from '../../services/address-book/index.js'
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import { countryLabelOf, getAddressFormCountries } from './address-countries.js'

export const isNotFound = (err) => err.status === HTTP_STATUS_NOT_FOUND

export const findLiveRecord = async (loadRecord, organisationId, id) => {
  try {
    const record = await loadRecord(organisationId, id)
    return record.deleted ? undefined : record
  } catch (err) {
    if (isNotFound(err)) {
      return undefined
    }
    throw err
  }
}

export const findLiveRecordWithCountryLabel = async (
  loadRecord,
  organisationId,
  id
) => {
  const record = await findLiveRecord(loadRecord, organisationId, id)
  if (!record) {
    return undefined
  }
  const countries = await getAddressFormCountries()
  return {
    record,
    countryLabel: countryLabelOf(countries, record.countryCode)
  }
}

export const findLiveAddress = (organisationId, addressId) =>
  findLiveRecord(getAddress, organisationId, addressId)

export const findLiveAddressWithCountryLabel = async (
  organisationId,
  addressId
) => {
  const found = await findLiveRecordWithCountryLabel(
    getAddress,
    organisationId,
    addressId
  )
  return found && { address: found.record, countryLabel: found.countryLabel }
}

const knownBoomOf = (err) => {
  if (Boom.isBoom(err)) {
    return err
  }
  if (isNotFound(err)) {
    return Boom.notFound()
  }
  return undefined
}

export const boomFor = (err, logUnexpected) => {
  const knownBoom = knownBoomOf(err)
  if (knownBoom) {
    return knownBoom
  }
  logUnexpected()
  return Boom.internal()
}
