import { isStubMode } from '#/server/common/services/mode.js'
import {
  addressBookClient as realClient,
  mapApiErrorsToFormErrors,
  ORGANISATION_ID_HEADER,
  throwOnError
} from './address-book-client.real.js'
import { addressBookClient as stubClient } from './address-book-client.stub.js'

export const addressBookClient = isStubMode() ? stubClient : realClient

export { mapApiErrorsToFormErrors, ORGANISATION_ID_HEADER, throwOnError }
