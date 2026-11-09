import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  transporterDeletePath,
  transporterEditPath,
  transporterRoutePath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { redirectingRecordIdRouteOptions } from '../record-id-params.js'
import { getAddressFormCountries } from '../address-countries.js'
import { boomFor } from '../stored-address.js'
import { findLiveTransporterWithCountryLabel } from '../stored-transporter.js'
import { transporterCountryLabelOf } from '../view-model/list.js'
import { honouredReturnOf, pathWithReturn } from '../return-to.js'
import {
  transporterDeadLinkDestination,
  transporterReturnDestinationOf
} from './transporter-return.js'
import { transporterSummaryRows } from './transporter-summary.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/transporter/view'
const copy = copyFor({ en, cy })

const summaryLabelFor = (field) =>
  field === 'approvalNumber' || field === 'type'
    ? copy.list.table[field]
    : copy.form.fields[field]

const transporterViewOf = (
  transporter,
  countryLabel,
  { id, honouredReturn, returnDestination }
) => ({
  ...kit.base(transporter.name, { backLink: returnDestination }),
  copy,
  heading: transporter.name,
  editHref: pathWithReturn(transporterEditPath(id), honouredReturn),
  deleteHref: pathWithReturn(transporterDeletePath(id), honouredReturn),
  summaryRows: transporterSummaryRows(transporter, {
    countryLabel,
    typeLabel: copy.list.transporterTypes[transporter.type] ?? transporter.type,
    labelFor: summaryLabelFor
  })
})

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id } = request.params
  const honouredReturn = honouredReturnOf(request)
  const returnDestination = transporterReturnDestinationOf(id, honouredReturn)

  try {
    const live = await findLiveTransporterWithCountryLabel(organisationId, id)
    if (!live) {
      logger.info(
        { organisationId, transporterId: id },
        'No transporter is live at this id, redirecting away from its view page'
      )
      return toolkit.redirect(returnDestination)
    }

    const countries = await getAddressFormCountries()
    const countryLabel = transporterCountryLabelOf(
      live.transporter,
      countries,
      copy.commercialTransporterForm.country
    )
    return toolkit.view(
      view,
      transporterViewOf(live.transporter, countryLabel, {
        id,
        honouredReturn,
        returnDestination
      })
    )
  } catch (err) {
    throw boomFor(err, () =>
      logger.error(
        { err, organisationId, transporterId: id },
        'Failed to load the transporter'
      )
    )
  }
}

export const routes = kit.pageRoutes(
  transporterRoutePath(),
  { get },
  redirectingRecordIdRouteOptions(transporterDeadLinkDestination)
)
