import { isStubMode } from '#/server/common/services/mode.js'
import { addressLookupClient as realClient } from './address-lookup-client.real.js'
import { addressLookupClient as stubClient } from './address-lookup-client.stub.js'

export const addressLookupClient = isStubMode() ? stubClient : realClient
