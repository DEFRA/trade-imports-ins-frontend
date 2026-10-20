import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  addressDeletePath,
  addressEditPath,
  addressRoutePath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  countryLabelOf,
  getAddressFormCountries
} from '../address-countries.js'
import { deadLinkRouteOptions } from '../address-id-params.js'
import { FIELD_RULES } from '../fields.js'
import { boomFor, findLiveAddress } from '../stored-address.js'
import {
  deadLinkDestination,
  readReturn,
  returnAwayFrom,
  withReturn
} from '../return-to.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/view/view'
const copy = copyFor({ en, cy })

const isOptional = (field) => FIELD_RULES[field]?.required === false

const hasText = (value) => Boolean(value?.trim?.())

export const buildRows = (address, countryLabel) =>
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
      text: countryLabel
    },
    { field: 'email', label: copy.form.fields.email, text: address.email },
    { field: 'phone', label: copy.form.fields.phone, text: address.phone }
  ]
    .filter(({ field, text }) => !isOptional(field) || hasText(text))
    .map(({ label, text }) => ({ key: { text: label }, value: { text } }))

const get = async (request, toolkit) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params
  const returnTo = readReturn(request)

  try {
    const address = await findLiveAddress(orgId, id)
    if (!address) {
      return toolkit.redirect(returnAwayFrom(id, returnTo))
    }
    const countries = await getAddressFormCountries()
    return toolkit.view(view, {
      ...kit.base(address.name, { backLink: returnAwayFrom(id, returnTo) }),
      copy,
      heading: address.name,
      editHref: withReturn(addressEditPath(id), returnTo),
      deleteHref: withReturn(addressDeletePath(id), returnTo),
      summaryRows: buildRows(
        address,
        countryLabelOf(countries, address.countryCode)
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
  deadLinkRouteOptions(deadLinkDestination)
)
