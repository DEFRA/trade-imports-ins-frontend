import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  addressDeletePath,
  addressEditPath,
  addressRoutePath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { addressIdOrRedirectRouteOptions } from '../address-id-params.js'
import {
  ADDRESS_FIELDS,
  addressFieldTextOrNull,
  isRequiredField
} from '../fields.js'
import { boomFor, findLiveAddressWithCountryLabel } from '../stored-address.js'
import {
  deadLinkDestination,
  honouredReturnOrNull,
  honouredReturnOrAddressBook,
  pathWithReturn
} from '../return-to.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/view/view'
const copy = copyFor({ en, cy })

const hasText = (value) => Boolean(value?.trim?.())

const ROW_FIELDS = [...ADDRESS_FIELDS, 'email', 'phone']

export const buildRows = (address, countryLabel) =>
  ROW_FIELDS.map((field) => ({
    field,
    text: addressFieldTextOrNull(address, countryLabel, field)
  }))
    .filter(({ field, text }) => isRequiredField(field) || hasText(text))
    .map(({ field, text }) => ({
      key: { text: copy.form.fields[field] },
      value: { text }
    }))

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: addressId } = request.params
  const honouredReturn = honouredReturnOrNull(request)

  try {
    const liveAddressWithCountryLabel = await findLiveAddressWithCountryLabel(
      organisationId,
      addressId
    )
    if (!liveAddressWithCountryLabel) {
      logger.info(
        { organisationId, addressId },
        'Address not live, redirecting away from its view page'
      )
      return toolkit.redirect(
        honouredReturnOrAddressBook(addressId, honouredReturn)
      )
    }
    const { address, countryLabel } = liveAddressWithCountryLabel
    return toolkit.view(view, {
      ...kit.base(address.name, {
        backLink: honouredReturnOrAddressBook(addressId, honouredReturn)
      }),
      copy,
      heading: address.name,
      editHref: pathWithReturn(addressEditPath(addressId), honouredReturn),
      deleteHref: pathWithReturn(addressDeletePath(addressId), honouredReturn),
      summaryRows: buildRows(address, countryLabel)
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error({ err, organisationId, addressId }, 'Failed to load address')
    )
  }
}

export const routes = kit.pageRoutes(
  addressRoutePath(),
  { get },
  addressIdOrRedirectRouteOptions(deadLinkDestination)
)
