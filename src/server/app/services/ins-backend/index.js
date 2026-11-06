import { isStubMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

export const listNotifications = (stubSeedOrganisationId, search) =>
  isStubMode()
    ? stub.listNotifications(stubSeedOrganisationId, search)
    : client.listNotifications(search)
