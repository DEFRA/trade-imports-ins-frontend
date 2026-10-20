import Boom from '@hapi/boom'

import { getAddress } from '../../services/address-book/index.js'
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'

export const loadStoredAddress = async (orgId, id) => {
  const address = await getAddress(orgId, id)
  if (address.deleted) {
    throw Boom.notFound()
  }
  return address
}

/** Reads an address, treating anything that is not a live address in this book as absent. */
export const findLiveAddress = async (orgId, id) => {
  try {
    const address = await getAddress(orgId, id)
    return address.deleted ? undefined : address
  } catch (err) {
    if (err.status === HTTP_STATUS_NOT_FOUND) {
      return undefined
    }
    throw err
  }
}

export const boomFor = (err, logUnexpected) => {
  if (err.isBoom) {
    return err
  }
  if (err.status === HTTP_STATUS_NOT_FOUND) {
    return Boom.notFound()
  }
  logUnexpected()
  return Boom.internal()
}
