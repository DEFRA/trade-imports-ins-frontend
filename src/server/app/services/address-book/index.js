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

export const mapApiErrorsToFormErrors = (problemBody) => {
  const errors = problemBody?.errors ?? {}
  const errorList = Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((text) => ({ text, href: `#${field}` }))
  )
  const fieldErrors = Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      { text: messages[0] }
    ])
  )
  return { errorList, fieldErrors }
}

export const isValidationFailure = (err) =>
  err?.status === HTTP_STATUS_BAD_REQUEST && Boolean(err.body?.errors)
