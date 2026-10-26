import { deleteAddress } from '../../../services/address-book/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import { addressDeleteRoutePath, addressPath } from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { redirectingAddressIdRouteOptions } from '../address-id-params.js'
import { ADDRESS_FIELDS, addressFieldText } from '../fields.js'
import { addressLinesHtml } from '../address-lines.js'
import {
  boomFor,
  findLiveAddress,
  findLiveAddressWithCountryLabel,
  isNotFound
} from '../stored-address.js'
import {
  deadLinkDestination,
  landsOnAddressBook,
  honouredReturnOf,
  returnDestinationOf,
  pathWithReturn
} from '../return-to.js'
import { setSuccessMessage } from '../success-message.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/delete/delete'
const copy = copyFor({ en, cy })

export const addressSummaryLines = (address, countryLabel) =>
  ADDRESS_FIELDS.map((field) =>
    addressFieldText(address, countryLabel, field)
  ).filter(Boolean)

export const deletedSuccessMessage = (name) =>
  name ? copy.successBanner.deleted(name) : copy.successBanner.deletedUnnamed

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: addressId } = request.params
  const honouredReturn = honouredReturnOf(request)

  try {
    const liveAddressWithCountryLabel = await findLiveAddressWithCountryLabel(
      organisationId,
      addressId
    )
    if (!liveAddressWithCountryLabel) {
      logger.info(
        { organisationId, addressId },
        'Address not live, redirecting away from its delete page'
      )
      return toolkit.redirect(returnDestinationOf(addressId, honouredReturn))
    }
    const lines = addressSummaryLines(
      liveAddressWithCountryLabel.address,
      liveAddressWithCountryLabel.countryLabel
    )
    const addressPageHref = pathWithReturn(
      addressPath(addressId),
      honouredReturn
    )
    return toolkit.view(view, {
      ...kit.base(copy.delete.title, { backLink: addressPageHref }),
      copy,
      addressHtml: addressLinesHtml(
        lines.length ? lines : [copy.delete.notApplicable]
      ),
      cancelHref: addressPageHref
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error(
        { err, organisationId, addressId },
        'Failed to load address for delete'
      )
    )
  }
}

const post = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: addressId } = request.params
  const destination = returnDestinationOf(addressId, honouredReturnOf(request))

  try {
    const address = await findLiveAddress(organisationId, addressId)
    if (!address) {
      logger.info(
        { organisationId, addressId },
        'Address not live, nothing to delete'
      )
      return toolkit.redirect(destination)
    }
    await deleteAddress(organisationId, addressId)
    if (landsOnAddressBook(destination)) {
      setSuccessMessage(request, deletedSuccessMessage(address.name))
    }
    return toolkit.redirect(destination)
  } catch (err) {
    if (isNotFound(err)) {
      logger.info(
        { organisationId, addressId },
        'Address already gone when deleted'
      )
      return toolkit.redirect(destination)
    }
    throw boomFor(err, () =>
      logger.error(
        { err, organisationId, addressId },
        'Failed to delete address'
      )
    )
  }
}

export const routes = kit.pageRoutes(
  addressDeleteRoutePath(),
  { get, post },
  redirectingAddressIdRouteOptions(deadLinkDestination)
)
