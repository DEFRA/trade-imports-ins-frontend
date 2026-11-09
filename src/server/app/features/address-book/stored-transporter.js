import { getTransporter } from '../../services/transporters/index.js'
import { isNotFound } from './stored-address.js'
import { countryLabelOf, getAddressFormCountries } from './address-countries.js'

export const findLiveTransporter = async (organisationId, transporterId) => {
  try {
    const transporter = await getTransporter(organisationId, transporterId)
    return transporter.deleted ? undefined : transporter
  } catch (err) {
    if (isNotFound(err)) {
      return undefined
    }
    throw err
  }
}

export const findLiveTransporterWithCountryLabel = async (
  organisationId,
  transporterId
) => {
  const transporter = await findLiveTransporter(organisationId, transporterId)
  if (!transporter) {
    return undefined
  }
  const countries = await getAddressFormCountries()
  return {
    transporter,
    countryLabel: countryLabelOf(countries, transporter.countryCode)
  }
}
