import { getTransporter } from '../../services/transporters/index.js'
import { findLiveRecordWithCountryLabel } from './stored-address.js'

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
