import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../config/config.js'

export const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

export const NOTIFICATION_LIST_ORGANISATION_REQUIRED =
  'Cannot reach the notification list without an organisation: the signed-in session carries none'

export const ADDRESS_BOOK_ORGANISATION_REQUIRED =
  'Cannot reach the address book without an organisation: the signed-in session carries none'

export const refuseWithoutOrganisation = (organisationId, message) => {
  if (!organisationId) {
    throw new Error(message)
  }
}

export const organisationScopedHeaders = (organisationId) => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: organisationId,
  [config.get('tracing.header')]: getTraceId() ?? ''
})
