import { deleteAddress } from '../../../services/address-book/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import { addressDeleteRoutePath, addressPath } from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  countryLabelOf,
  getAddressFormCountries
} from '../address-countries.js'
import { deadLinkRouteOptions } from '../address-id-params.js'
import { boomFor, findLiveAddress, isNotFound } from '../stored-address.js'
import {
  deadLinkDestination,
  landsOnAddressBook,
  honouredReturnOrNull,
  honouredReturnOrAddressBook,
  pathWithReturn
} from '../return-to.js'
import { setSuccessBanner } from '../success-banner.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/delete/delete'
const copy = copyFor({ en, cy })

export const addressSummaryLines = (address, countryLabel) =>
  [
    address.name,
    address.addressLine1,
    address.addressLine2,
    address.townOrCity,
    address.county,
    address.postcode,
    countryLabel
  ].filter(Boolean)

export const deletedBannerText = (name) =>
  name ? copy.successBanner.deleted(name) : copy.successBanner.deletedUnnamed

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: addressId } = request.params
  const honouredReturn = honouredReturnOrNull(request)

  try {
    const address = await findLiveAddress(organisationId, addressId)
    if (!address) {
      logger.info(
        { organisationId, addressId },
        'Address not live, redirecting away from its delete page'
      )
      return toolkit.redirect(
        honouredReturnOrAddressBook(addressId, honouredReturn)
      )
    }
    const countries = await getAddressFormCountries()
    const lines = addressSummaryLines(
      address,
      countryLabelOf(countries, address.countryCode)
    )
    const viewHref = pathWithReturn(addressPath(addressId), honouredReturn)
    return toolkit.view(view, {
      ...kit.base(copy.delete.title, { backLink: viewHref }),
      copy,
      addressLines: lines.length ? lines : [copy.delete.notApplicable],
      cancelHref: viewHref
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
  const destination = honouredReturnOrAddressBook(
    addressId,
    honouredReturnOrNull(request)
  )

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
      setSuccessBanner(request, deletedBannerText(address.name))
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
  deadLinkRouteOptions(deadLinkDestination)
)
