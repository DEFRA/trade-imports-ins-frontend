import { getTransporter } from '../../services/transporters/index.js'
import {
  findLiveRecord,
  findLiveRecordWithCountryLabel
} from './stored-address.js'

export const findLiveTransporter = (organisationId, transporterId) =>
  findLiveRecord(getTransporter, organisationId, transporterId)

export const findLiveTransporterWithCountryLabel = async (
  organisationId,
  transporterId
) => {
  const found = await findLiveRecordWithCountryLabel(
    getTransporter,
    organisationId,
    transporterId
  )
  return (
    found && { transporter: found.record, countryLabel: found.countryLabel }
  )
}
