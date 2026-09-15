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
