import { isStubMode } from '#/server/common/services/mode.js'
import { countriesClient as realClient } from './countries-client.real.js'
import { countriesClient as stubClient } from './countries-client.stub.js'

export const countriesClient = isStubMode() ? stubClient : realClient
