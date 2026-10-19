import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  addressBookPath,
  addressDeletePath,
  addressEditPath,
  addressRoutePath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { countryNameOf, getAddressFormCountries } from '../address-countries.js'
import { deadLinkRouteOptions } from '../address-id-params.js'
import { boomFor, findLiveAddress } from '../stored-address.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/view/view'
const copy = copyFor({ en, cy })

const OPTIONAL_ROWS = new Set(['addressLine2', 'county'])

const hasText = (value) => Boolean(value?.trim?.())

export const buildRows = (address, countryName) =>
  [
    { field: 'name', label: copy.form.fields.name, text: address.name },
    {
      field: 'addressLine1',
      label: copy.form.fields.addressLine1,
      text: address.addressLine1
    },
    {
      field: 'addressLine2',
      label: copy.form.fields.addressLine2,
      text: address.addressLine2
    },
    {
      field: 'townOrCity',
      label: copy.form.fields.townOrCity,
      text: address.townOrCity
    },
    { field: 'county', label: copy.form.fields.county, text: address.county },
    {
      field: 'postcode',
      label: copy.form.fields.postcode,
      text: address.postcode
    },
    {
      field: 'countryCode',
      label: copy.form.fields.countryCode,
      text: countryName ?? address.countryCode
    },
    { field: 'email', label: copy.form.fields.email, text: address.email },
    { field: 'phone', label: copy.form.fields.phone, text: address.phone }
  ]
    .filter(({ field, text }) => !OPTIONAL_ROWS.has(field) || hasText(text))
    .map(({ label, text }) => ({ key: { text: label }, value: { text } }))

const get = async (request, toolkit) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await findLiveAddress(orgId, id)
    if (!address) {
      return toolkit.redirect(addressBookPath())
    }
    const countries = await getAddressFormCountries()
    return toolkit.view(view, {
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
  deadLinkRouteOptions(addressBookPath)
)
