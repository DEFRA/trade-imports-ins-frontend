import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
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
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/view/view'
const copy = copyFor({ en, cy })

export const buildRows = (address, countryName) => [
  { key: { text: copy.form.fields.name }, value: { text: address.name } },
  {
    key: { text: copy.form.fields.addressLine1 },
    value: { text: address.addressLine1 }
  },
  {
    key: { text: copy.form.fields.addressLine2 },
    value: { text: address.addressLine2 }
  },
  {
    key: { text: copy.form.fields.townOrCity },
    value: { text: address.townOrCity }
  },
  { key: { text: copy.view.countyRowLabel }, value: { text: address.county } },
  {
    key: { text: copy.form.fields.postcode },
    value: { text: address.postcode }
  },
  {
    key: { text: copy.form.fields.countryCode },
    value: { text: countryName ?? address.countryCode }
  },
  { key: { text: copy.form.fields.email }, value: { text: address.email } },
  { key: { text: copy.form.fields.phone }, value: { text: address.phone } }
]

const countryNameOf = (countries, countryCode) =>
  countries.find((country) => country.code === countryCode)?.name ?? countryCode

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await loadStoredAddress(orgId, id)
    const countries = await getAddressFormCountries()
    return h.view(view, {
      ...kit.base(address.name, { backLink: addressBookPath() }),
      copy,
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
