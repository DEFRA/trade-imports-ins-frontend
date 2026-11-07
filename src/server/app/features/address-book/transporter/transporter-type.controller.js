import { HTTP_STATUS_BAD_REQUEST } from '../../../lib/http-status.js'
import { requiredOneOf, validate } from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  commercialTransporterPath,
  privateTransporterPath,
  transporterTypePath
} from '../../../shared/paths.js'
import { TRANSPORTER_TYPES } from '../../../services/transporters/index.js'
import { transporterBackHref } from '../transporter-navigation.js'
import {
  storeChosenTransporterType,
  storedChosenTransporterType
} from '../transporter-in-progress.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const view = 'address-book/transporter/transporter-type'
const copy = copyFor({ en, cy })

const transporterTypeRules = () =>
  requiredOneOf(
    'transporterType',
    Object.values(TRANSPORTER_TYPES),
    copy.errors.transporterType.required
  )

const hintOf = (type) => {
  const { hint } = copy.transporterType.options[type]
  return hint ? { text: hint } : null
}

const radioItemsOf = (selectedType) =>
  Object.values(TRANSPORTER_TYPES).map((type) => ({
    value: type,
    text: copy.transporterType.options[type].label,
    hint: hintOf(type),
    checked: type === selectedType
  }))

const buildView = (toolkit, { selectedType, errors = {} }) =>
  toolkit
    .view(view, {
      ...kit.base(copy.transporterType.title, {
        backLink: transporterBackHref()
      }),
      copy,
      radioItems: radioItemsOf(selectedType),
      errors,
      errorSummary: kit.errorSummary(errors)
    })
    .header('Cache-Control', 'no-store')

const get = (request, toolkit) =>
  buildView(toolkit, { selectedType: storedChosenTransporterType(request) })

const destinationFor = (transporterType) =>
  transporterType === TRANSPORTER_TYPES.COMMERCIAL
    ? commercialTransporterPath()
    : privateTransporterPath()

const post = (request, toolkit) => {
  const { errors, value } = validate(transporterTypeRules(), request.payload)
  if (errors) {
    return buildView(toolkit, { errors }).code(HTTP_STATUS_BAD_REQUEST)
  }
  storeChosenTransporterType(request, value.transporterType)
  return toolkit.redirect(destinationFor(value.transporterType))
}

export const routes = kit.pageRoutes(transporterTypePath(), { get, post })
