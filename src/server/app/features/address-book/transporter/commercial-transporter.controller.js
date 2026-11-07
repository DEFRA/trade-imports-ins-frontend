import {
  NORTHERN_IRELAND_COUNTRY_CODE,
  TRANSPORTER_TYPES
} from '../../../services/transporters/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../lib/http-status.js'
import {
  compose,
  oneOf,
  requiredMaxText,
  validate
} from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  commercialTransporterPath,
  transporterTypePath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  transporterFieldRuleFor,
  transporterFormValuesOf
} from '../transporter-fields.js'
import {
  storedChosenTransporterType,
  storedEnteredTransporter,
  storeEnteredTransporter
} from '../transporter-in-progress.js'
import {
  transporterCancelHref,
  transporterCancelLabel
} from '../transporter-navigation.js'
import { saveTransporter } from '../transporter-save.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const APPROVAL_NUMBER_MAX_LENGTH = 50

const logger = createLogger()
const view = 'address-book/transporter/commercial-transporter'
const bundle = copyFor({ en, cy })
const copy = bundle.commercialTransporterForm
const errors = bundle.errors

const commercialTransporterRules = () =>
  compose(
    ...[
      'name',
      'addressLine1',
      'addressLine2',
      'townOrCity',
      'county',
      'postcode',
      'email',
      'phone'
    ].map(transporterFieldRuleFor),
    requiredMaxText('approvalNumber', APPROVAL_NUMBER_MAX_LENGTH, {
      required: errors.approvalNumber.required,
      maxLength: errors.approvalNumber.maxLength(APPROVAL_NUMBER_MAX_LENGTH)
    }),
    oneOf('countryCode', [NORTHERN_IRELAND_COUNTRY_CODE], errors.countryFixed)
  )

const buildView = (
  toolkit,
  { formValues, errors: fieldErrors = {}, recoverableError = false }
) =>
  toolkit
    .view(view, {
      ...kit.base(copy.title, {
        backLink: transporterTypePath(),
        recoverableError
      }),
      copy,
      formValues,
      countryLabel: copy.country,
      countryCode: NORTHERN_IRELAND_COUNTRY_CODE,
      errors: fieldErrors,
      errorSummary: kit.errorSummary(fieldErrors),
      cancelHref: transporterCancelHref(),
      cancelLabel: transporterCancelLabel()
    })
    .header('Cache-Control', 'no-store')

const formValuesWithApprovalNumber = (payload) => ({
  ...transporterFormValuesOf(payload),
  approvalNumber: (payload.approvalNumber ?? '').trim()
})

const get = (request, toolkit) => {
  if (storedChosenTransporterType(request) !== TRANSPORTER_TYPES.COMMERCIAL) {
    return toolkit.redirect(transporterTypePath())
  }
  const { formValues } = storedEnteredTransporter(request) ?? {}
  return buildView(toolkit, { formValues: formValues ?? {} })
}

const post = async (request, toolkit) => {
  if (storedChosenTransporterType(request) !== TRANSPORTER_TYPES.COMMERCIAL) {
    return toolkit.redirect(transporterTypePath())
  }
  const organisationId = kit.requireOrganisationId(request)
  const payload = request.payload ?? {}
  const formValues = formValuesWithApprovalNumber(payload)
  storeEnteredTransporter(request, formValues)

  const { errors: fieldErrors } = validate(commercialTransporterRules(), {
    ...formValues,
    countryCode: (payload.countryCode ?? '').trim()
  })
  if (fieldErrors) {
    if (fieldErrors.countryCode === errors.countryFixed) {
      logger.warn(
        { organisationId },
        'Commercial transporter form posted a country that is not the fixed one'
      )
    }
    return buildView(toolkit, { formValues, errors: fieldErrors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  return saveTransporter(request, toolkit, {
    payload: {
      ...formValues,
      countryCode: NORTHERN_IRELAND_COUNTRY_CODE,
      type: TRANSPORTER_TYPES.COMMERCIAL
    },
    formValues,
    buildView
  })
}

export const routes = kit.pageRoutes(commercialTransporterPath(), {
  get,
  post
})
