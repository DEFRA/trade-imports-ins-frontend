import { deleteAddress } from '../../../services/address-book/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  addressBookPath,
  addressDeleteRoutePath,
  addressPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { HTTP_STATUS_NOT_FOUND } from '../../../lib/http-status.js'
import { countryNameOf, getAddressFormCountries } from '../address-countries.js'
import { deadLinkRouteOptions } from '../address-id-params.js'
import { boomFor, findLiveAddress } from '../stored-address.js'
import { setSuccessBanner } from '../success-banner.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/delete/delete'
const copy = copyFor({ en, cy })

const trimmed = (value) => value?.trim?.() ?? ''

const isRepeatOf = (kept) => (value) =>
  kept.some((line) => line.toLowerCase() === value.toLowerCase())

const withoutRepeats = (values) =>
  values.reduce(
    (kept, value) => (isRepeatOf(kept)(value) ? kept : [...kept, value]),
    []
  )

export const addressSummaryLines = (address, countryName) =>
  withoutRepeats(
    [
      address.name,
      address.addressLine1,
      address.addressLine2,
      address.townOrCity,
      address.county,
      address.postcode,
      countryName
    ]
      .map(trimmed)
      .filter(Boolean)
  )

const sentenceCase = (text) =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()

export const deletedBannerText = (name) => {
  const text = trimmed(name)
  return text
    ? copy.successBanner.deleted(sentenceCase(text))
    : copy.successBanner.deletedUnnamed
}

const get = async (request, toolkit) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await findLiveAddress(orgId, id)
    if (!address) {
      return toolkit.redirect(addressBookPath())
    }
    const countries = await getAddressFormCountries()
    const lines = addressSummaryLines(
      address,
      countryNameOf(countries, address.countryCode)
    )
    return toolkit.view(view, {
      ...kit.base(copy.delete.title, { backLink: addressPath(id) }),
      copy,
      addressLines: lines.length ? lines : [copy.delete.notApplicable],
      cancelHref: addressPath(id)
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error({ err, orgId, id }, 'Failed to load address for delete')
    )
  }
}

const post = async (request, toolkit) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await findLiveAddress(orgId, id)
    if (!address) {
      return toolkit.redirect(addressBookPath())
    }
    await deleteAddress(orgId, id)
    setSuccessBanner(request, deletedBannerText(address.name))
    return toolkit.redirect(addressBookPath())
  } catch (err) {
    if (err.status === HTTP_STATUS_NOT_FOUND) {
      return toolkit.redirect(addressBookPath())
    }
    throw boomFor(err, () =>
      logger.error({ err, orgId, id }, 'Failed to delete address')
    )
  }
}

export const routes = kit.pageRoutes(
  addressDeleteRoutePath(),
  { get, post },
  deadLinkRouteOptions(addressBookPath)
)
