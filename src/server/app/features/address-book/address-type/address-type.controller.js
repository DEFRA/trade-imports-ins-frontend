import { HTTP_STATUS_BAD_REQUEST } from '../../../lib/http-status.js'
import { requiredOneOf, validate } from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  addressAddPath,
  addressBookPath,
  addressTypePath,
  isAddressTypeStart
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import {
  storedChosenAddressType,
  clearAddInProgress,
  storeChosenAddressType
} from '../add-in-progress.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const view = 'address-book/address-type/address-type'
const copy = copyFor({ en, cy })
const logger = createLogger()

const addressTypeRules = () =>
  requiredOneOf(
    'addressType',
    Object.values(ADDRESS_TYPES),
    copy.errors.addressType.required
  )

const radioItemsOf = (selectedAddressType) =>
  Object.values(ADDRESS_TYPES).map((addressType) => ({
    value: addressType,
    text: copy.addressType.options[addressType].label,
    hint: { text: copy.addressType.options[addressType].hint },
    checked: addressType === selectedAddressType
  }))

const buildView = (toolkit, { selectedAddressType, errors = {} }) =>
  toolkit
    .view(view, {
      ...kit.base(copy.addressType.title, { backLink: addressBookPath() }),
      copy,
      radioItems: radioItemsOf(selectedAddressType),
      errors,
      errorSummary: kit.errorSummary(errors)
    })
    .header('Cache-Control', 'no-store')

const get = (request, toolkit) => {
  if (isAddressTypeStart(request.query)) {
    clearAddInProgress(request)
    logger.info(
      {
        organisationId: kit.requireOrganisationId(request),
        path: request.path
      },
      'Starting a new address, clearing the address being added'
    )
  }
  return buildView(toolkit, {
    selectedAddressType: storedChosenAddressType(request)
  })
}

const post = (request, toolkit) => {
  const { errors, value } = validate(addressTypeRules(), request.payload)
  if (errors) {
    return buildView(toolkit, { errors }).code(HTTP_STATUS_BAD_REQUEST)
  }
  storeChosenAddressType(request, value.addressType)
  return toolkit.redirect(addressAddPath())
}

export const routes = kit.pageRoutes(addressTypePath(), { get, post })
