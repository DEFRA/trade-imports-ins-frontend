import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  addressDeletePath,
  addressEditPath,
  addressRoutePath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { redirectingRecordIdRouteOptions } from '../record-id-params.js'
import { ADDRESS_FIELDS, addressFieldText, isRequiredField } from '../fields.js'
import { boomFor, findLiveAddressWithCountryLabel } from '../stored-address.js'
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

    logger.info(
      { organisationId, id },
      'No address is live at this id, redirecting away from its view page'
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
  redirectingRecordIdRouteOptions(deadLinkDestination)
)
