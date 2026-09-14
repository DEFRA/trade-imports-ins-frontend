import * as kit from '../../../shared/kit.js'
import {
  addressBookPath,
  addressDeletePath,
  addressEditPath,
  addressRoutePath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { getAddressFormCountries } from '../address-countries.js'
import { addressIdRouteOptions } from '../address-id-params.js'
import { boomFor, loadStoredAddress } from '../stored-address.js'

const logger = createLogger()
const view = 'address-book/view/template'

export const buildRows = (address, countryName) => [
  {
    key: { text: 'Name or organisation name' },
    value: { text: address.name }
  },
  { key: { text: 'Address line 1' }, value: { text: address.addressLine1 } },
  {
    key: { text: 'Address line 2 (optional)' },
    value: { text: address.addressLine2 }
  },
  { key: { text: 'Town or city' }, value: { text: address.townOrCity } },
  { key: { text: 'County' }, value: { text: address.county } },
  {
    key: { text: 'Postcode or Zip code' },
    value: { text: address.postcode }
  },
  {
    key: { text: 'Country' },
    value: { text: countryName ?? address.countryCode }
  },
  { key: { text: 'Email address' }, value: { text: address.email } },
  { key: { text: 'Phone number' }, value: { text: address.phone } }
]

const countryNameOf = (countries, countryCode) =>
  countries.find((country) => country.code === countryCode)?.name ?? countryCode

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await loadStoredAddress(orgId, id)
    const countries = await getAddressFormCountries().catch(() => [])
    return h.view(view, {
      ...kit.base(address.name, { backLink: addressBookPath() }),
      heading: address.name,
      editHref: addressEditPath(id),
      deleteHref: addressDeletePath(id),
      summaryRows: buildRows(
        address,
        countryNameOf(countries, address.countryCode)
      )
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error({ err, orgId, id }, 'Failed to load address')
    )
  }
}

export const routes = kit.pageRoutes(
  addressRoutePath(),
  { get },
  addressIdRouteOptions
)
