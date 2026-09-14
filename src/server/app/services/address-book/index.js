import { isStubMode } from '../../../common/services/mode.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import * as client from './client.js'
import * as stub from './stub.js'

const addressBook = () => (isStubMode() ? stub : client)

export const listAddresses = (orgId, search) =>
  addressBook().listAddresses(orgId, search)

export const createAddress = (orgId, body) =>
  addressBook().createAddress(orgId, body)

export const getAddress = (orgId, id) => addressBook().getAddress(orgId, id)

export const updateAddress = (orgId, id, body) =>
  addressBook().updateAddress(orgId, id, body)

export const deleteAddress = (orgId, id) =>
  addressBook().deleteAddress(orgId, id)

export const mapApiErrorsToFormErrors = (problemBody) =>
  Object.fromEntries(
    Object.entries(problemBody?.errors ?? {}).map(([field, messages]) => [
      field,
      messages[0]
    ])
  )

export const isValidationFailure = (err) =>
  err?.status === HTTP_STATUS_BAD_REQUEST && Boolean(err.body?.errors)
