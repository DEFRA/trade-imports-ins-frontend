import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  addressDeletePath,
  addressEditPath,
  addressRoutePath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { redirectingAddressIdRouteOptions } from '../address-id-params.js'
import { ADDRESS_FIELDS, addressFieldText, isRequiredField } from '../fields.js'
import { getAddressFormCountries } from '../address-countries.js'
import { boomFor, findLiveAddressWithCountryLabel } from '../stored-address.js'
import { findLiveTransporterWithCountryLabel } from '../stored-transporter.js'
import { transporterCountryLabelOf } from '../view-model/list.js'
import {
  deadLinkDestination,
  honouredReturnOf,
  returnDestinationOf,
  pathWithReturn
} from '../return-to.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/view/view'
const copy = copyFor({ en, cy })

const TRANSPORTER_SUMMARY_FIELDS = [
  'name',
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postcode',
  'countryCode',
  'approvalNumber',
  'type',
  'email',
  'phone'
]

const summaryRowsOf = (fields, { textFor, labelFor }) =>
  fields
    .map((field) => ({ field, text: textFor(field) }))
    .filter(({ field, text }) => isRequiredField(field) || text)
    .map(({ field, text }) => ({
      key: { text: labelFor(field) },
      value: { text }
    }))

export const buildRows = (address, countryLabel) =>
  summaryRowsOf([...ADDRESS_FIELDS, 'email', 'phone'], {
    textFor: (field) => addressFieldText(address, countryLabel, field),
    labelFor: (field) => copy.form.fields[field]
  })

const transporterTypeLabelOf = (type) =>
  copy.list.transporterTypes[type] ?? type

const transporterSummaryLabelFor = (field) =>
  field === 'approvalNumber' || field === 'type'
    ? copy.list.table[field]
    : copy.form.fields[field]

const buildTransporterRows = (transporter, countryLabel) =>
  summaryRowsOf(TRANSPORTER_SUMMARY_FIELDS, {
    textFor: (field) =>
      field === 'type'
        ? transporterTypeLabelOf(transporter.type)
        : addressFieldText(transporter, countryLabel, field),
    labelFor: transporterSummaryLabelFor
  })

const addressViewOf = (
  { address, countryLabel },
  { id, honouredReturn, returnDestination }
) => ({
  ...kit.base(address.name, { backLink: returnDestination }),
  copy,
  heading: address.name,
  editHref: pathWithReturn(addressEditPath(id), honouredReturn),
  deleteHref: pathWithReturn(addressDeletePath(id), honouredReturn),
  summaryRows: buildRows(address, countryLabel)
})

const transporterViewOf = (transporter, countryLabel, returnDestination) => ({
  ...kit.base(transporter.name, { backLink: returnDestination }),
  copy,
  heading: transporter.name,
  summaryRows: buildTransporterRows(transporter, countryLabel)
})

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id } = request.params
  const honouredReturn = honouredReturnOf(request)
  const returnDestination = returnDestinationOf(id, honouredReturn)

  try {
    const liveAddressWithCountryLabel = await findLiveAddressWithCountryLabel(
      organisationId,
      id
    )
    if (liveAddressWithCountryLabel) {
      return toolkit.view(
        view,
        addressViewOf(liveAddressWithCountryLabel, {
          id,
          honouredReturn,
          returnDestination
        })
      )
    }

    const liveTransporterWithCountryLabel =
      await findLiveTransporterWithCountryLabel(organisationId, id)
    if (liveTransporterWithCountryLabel) {
      const { transporter } = liveTransporterWithCountryLabel
      const countries = await getAddressFormCountries()
      const countryLabel = transporterCountryLabelOf(
        transporter,
        countries,
        copy.commercialTransporterForm.country
      )
      return toolkit.view(
        view,
        transporterViewOf(transporter, countryLabel, returnDestination)
      )
    }

    logger.info(
      { organisationId, id },
      'Neither an address nor a transporter is live at this id, redirecting away from its view page'
    )
    return toolkit.redirect(returnDestination)
  } catch (err) {
    throw boomFor(err, () =>
      logger.error(
        { err, organisationId, id },
        'Failed to load the address book entry'
      )
    )
  }
}

export const routes = kit.pageRoutes(
  addressRoutePath(),
  { get },
  redirectingAddressIdRouteOptions(deadLinkDestination)
)
