import { isStubMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

export const listNotifications = (organisationId, search) =>
  isStubMode()
    ? stub.listNotifications(organisationId, search)
    : client.listNotifications(organisationId, search)
