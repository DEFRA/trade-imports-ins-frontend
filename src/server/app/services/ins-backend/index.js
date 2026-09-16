import { isStubMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

export const listNotifications = (search) =>
  isStubMode()
    ? stub.listNotifications(search)
    : client.listNotifications(search)
