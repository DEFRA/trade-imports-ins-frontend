import { deleteTransporter } from '../../../services/transporters/index.js'
import * as kit from '../../../shared/kit.js'
import { transporterDeletePage } from './page.js'
import { copyFor } from '../../../shared/copy.js'
import {
  transporterDeleteRoutePath,
  transporterPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { redirectingRecordIdRouteOptions } from '../record-id-params.js'
import { getAddressFormCountries } from '../address-countries.js'
import { linesHtml } from '../lines-html.js'
import { postalLinesOf } from '../fields.js'
import { boomFor, isNotFound } from '../stored-address.js'
import {
  findLiveTransporter,
  findLiveTransporterWithCountryLabel
} from '../stored-transporter.js'
import { honouredReturnOf, pathWithReturn } from '../return-to.js'
import { setSuccessMessage } from '../success-message.js'
import { transporterCountryLabelOf } from '../view-model/list.js'
import {
  transporterDeadLinkDestination,
  transporterReturnDestinationOf,
  transporterTabPath
} from './transporter-return.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/transporter/delete'
const bundle = copyFor({ en, cy })
const copy = bundle.deleteTransporter

/** A transporter as the confirmation page summarises it: its name, the lines
 * of its address, then the country it is in, so the trader can see they are
 * deleting the one they meant. */
export const transporterSummaryLines = (transporter, countryLabel) =>
  [transporter.name, ...postalLinesOf(transporter), countryLabel].filter(
    Boolean
  )

export const deletedSuccessMessage = (name) =>
  name
    ? bundle.successBanner.transporterDeleted(name)
    : bundle.successBanner.transporterDeletedUnnamed

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: transporterId } = request.params
  const honouredReturn = honouredReturnOf(request)

  try {
    const live = await findLiveTransporterWithCountryLabel(
      organisationId,
      transporterId
    )
    if (!live) {
      logger.info(
        { organisationId, transporterId },
        'Transporter not live, redirecting away from its delete page'
      )
      return toolkit.redirect(
        transporterReturnDestinationOf(transporterId, honouredReturn)
      )
    }
    const countryLabel = transporterCountryLabelOf(
      live.transporter,
      await getAddressFormCountries(),
      bundle.commercialTransporterForm.country
    )
    const lines = transporterSummaryLines(live.transporter, countryLabel)
    const transporterPageHref = pathWithReturn(
      transporterPath(transporterId),
      honouredReturn
    )
    return toolkit.view(view, {
      ...kit.base(copy.title, { backLink: transporterPageHref }),
      copy,
      transporterHtml: linesHtml(lines.length ? lines : [bundle.notApplicable]),
      cancelHref: transporterPageHref
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error(
        { err, organisationId, transporterId },
        'Failed to load transporter for delete'
      )
    )
  }
}

const post = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: transporterId } = request.params
  const honouredReturn = honouredReturnOf(request)
  const deadLinkDestination = transporterReturnDestinationOf(
    transporterId,
    honouredReturn
  )

  try {
    const transporter = await findLiveTransporter(organisationId, transporterId)
    if (!transporter) {
      logger.info(
        { organisationId, transporterId },
        'Transporter not live, nothing to delete'
      )
      return toolkit.redirect(deadLinkDestination)
    }
    await deleteTransporter(organisationId, transporterId)
    setSuccessMessage(request, deletedSuccessMessage(transporter.name))
    return toolkit.redirect(transporterTabPath())
  } catch (err) {
    if (isNotFound(err)) {
      logger.info(
        { organisationId, transporterId },
        'Transporter already gone when deleted'
      )
      return toolkit.redirect(deadLinkDestination)
    }
    throw boomFor(err, () =>
      logger.error(
        { err, organisationId, transporterId },
        'Failed to delete transporter'
      )
    )
  }
}

export const routes = kit.pageRoutes(
  transporterDeletePage,
  transporterDeleteRoutePath(),
  { get, post },
  redirectingRecordIdRouteOptions(transporterDeadLinkDestination)
)
