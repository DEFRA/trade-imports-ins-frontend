import { isStubMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

export {
  NORTHERN_IRELAND_COUNTRY_CODE,
  TRANSPORTER_TYPES
} from './transporter-types.js'

const transporters = () => (isStubMode() ? stub : client)

export const listTransporters = (organisationId, listQuery) =>
  transporters().listTransporters(organisationId, listQuery)

export const createTransporter = (organisationId, transporter) =>
  transporters().createTransporter(organisationId, transporter)

export const getTransporter = (organisationId, transporterId) =>
  transporters().getTransporter(organisationId, transporterId)

export const updateTransporter = (organisationId, transporterId, transporter) =>
  transporters().updateTransporter(organisationId, transporterId, transporter)

export const deleteTransporter = (organisationId, transporterId) =>
  transporters().deleteTransporter(organisationId, transporterId)
