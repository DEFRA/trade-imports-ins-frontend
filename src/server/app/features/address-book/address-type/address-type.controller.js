import { HTTP_STATUS_BAD_REQUEST } from '../../../lib/http-status.js'
import { requiredOneOf, validate } from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  addressAddPath,
  addressBookPath,
  addressTypePath
} from '../../../shared/paths.js'
import { ADDRESS_TYPES } from '../address-types.js'
import {
  chooseAddressType,
  chosenAddressType,
  clearAddInProgress
} from '../add-in-progress.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const view = 'address-book/address-type/address-type'
const copy = copyFor({ en, cy })
const START_NEW = 'new'

const itemsOf = () =>
  ADDRESS_TYPES.map((value) => ({
    value,
    text: copy.addressType.options[value].text,
    hint: { text: copy.addressType.options[value].hint }
  }))

const buildView = (toolkit, { chosen, errors = {} }) =>
  toolkit
    .view(view, {
      ...kit.base(copy.addressType.title, { backLink: addressBookPath() }),
      copy,
      items: itemsOf(),
      chosen,
      errors,
      errorSummary: kit.errorSummary(errors)
    })
    .header('Cache-Control', 'no-store')

const get = (request, toolkit) => {
  if (request.query.start === START_NEW) {
    clearAddInProgress(request)
  }
  return buildView(toolkit, { chosen: chosenAddressType(request) })
}

const post = (request, toolkit) => {
  const { errors, value } = validate(
    requiredOneOf(
      'addressType',
      ADDRESS_TYPES,
      copy.errors.addressType.required
    ),
    { addressType: request.payload?.addressType }
  )
  if (errors) {
    return buildView(toolkit, { chosen: null, errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  chooseAddressType(request, value.addressType)
  return toolkit.redirect(addressAddPath())
}

export const routes = kit.pageRoutes(addressTypePath(), { get, post })
