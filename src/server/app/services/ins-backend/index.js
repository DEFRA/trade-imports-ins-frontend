import { isStubMode } from '../../../common/services/mode.js'
import {
  NOTIFICATION_LIST_ORGANISATION_REQUIRED,
  refuseWithoutOrganisation
} from '../../../common/helpers/organisation-scoped-headers.js'
import * as client from './client.js'
import * as stub from './stub.js'

export const listNotifications = (organisationId, search) => {
  refuseWithoutOrganisation(
    organisationId,
    NOTIFICATION_LIST_ORGANISATION_REQUIRED
  )
  return isStubMode()
    ? stub.listNotifications(organisationId, search)
    : client.listNotifications(organisationId, search)
}
