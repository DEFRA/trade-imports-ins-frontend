import { isStubMode } from '../../../common/services/mode.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import * as client from './client.js'
import * as stub from './stub.js'

const addressBook = () => (isStubMode() ? stub : client)

export const listAddresses = (organisationId, search) =>
  addressBook().listAddresses(organisationId, search)

export const createAddress = (organisationId, address) =>
  addressBook().createAddress(organisationId, address)

export const getAddress = (organisationId, addressId) =>
  addressBook().getAddress(organisationId, addressId)

export const updateAddress = (organisationId, addressId, address) =>
  addressBook().updateAddress(organisationId, addressId, address)

export const deleteAddress = (organisationId, addressId) =>
  addressBook().deleteAddress(organisationId, addressId)

export const mapApiErrorsToFormErrors = (problemBody) =>
  Object.fromEntries(
    Object.entries(problemBody?.errors ?? {}).map(([field, messages]) => [
      field,
      messages[0]
    ])
  )

export const isValidationFailure = (err) =>
  err?.status === HTTP_STATUS_BAD_REQUEST && Boolean(err.body?.errors)
