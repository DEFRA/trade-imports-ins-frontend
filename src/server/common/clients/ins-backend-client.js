import { isStubMode } from '../services/mode.js'
import { insBackendClient as realClient } from './ins-backend-client.real.js'
import { insBackendClient as stubClient } from './ins-backend-client.stub.js'

export const insBackendClient = isStubMode() ? stubClient : realClient
