import {
  NORTHERN_IRELAND_COUNTRY_CODE,
  TRANSPORTER_TYPES
} from '../../../services/transporters/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../lib/http-status.js'
import { validate } from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import { commercialTransporterPath } from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  commercialTransporterFormValuesOf,
  commercialTransporterRules
} from '../transporter-fields.js'
import {
  clearTransporterAddInProgress,
  storedEnteredTransporter,
  storeEnteredTransporter
} from '../transporter-in-progress.js'
import {
  redirectUnlessOwnTransporterType,
  transporterCancelHref,
  transporterCancelLabel,
  transporterFormBackHref
} from '../transporter-navigation.js'
import { saveTransporter } from '../transporter-save.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/transporter/commercial-transporter'
const bundle = copyFor({ en, cy })
const copy = bundle.commercialTransporterForm
const errors = bundle.errors

const buildView = (
  toolkit,
  { formValues, errors: fieldErrors = {}, recoverableError = false }
) =>
  toolkit
    .view(view, {
      ...kit.base(copy.title, {
        backLink: transporterFormBackHref(),
        recoverableError
      }),
      copy,
      formValues,
      countryLabel: copy.country,
      countryCode: NORTHERN_IRELAND_COUNTRY_CODE,
      errors: fieldErrors,
      errorSummary: kit.errorSummary(fieldErrors),
      cancelLabel: transporterCancelLabel(TRANSPORTER_TYPES.COMMERCIAL)
    })
    .header('Cache-Control', 'no-store')

const get = (request, toolkit) => {
  const redirect = redirectUnlessOwnTransporterType(
    request,
    toolkit,
    TRANSPORTER_TYPES.COMMERCIAL
  )
  if (redirect) {
    return redirect
  }
  const formValues = storedEnteredTransporter(request) ?? {}
  return buildView(toolkit, { formValues })
}

const post = async (request, toolkit) => {
  const redirect = redirectUnlessOwnTransporterType(
    request,
    toolkit,
    TRANSPORTER_TYPES.COMMERCIAL
  )
  if (redirect) {
    return redirect
  }
  const organisationId = kit.requireOrganisationId(request)
  const payload = request.payload ?? {}
  if (payload.cancel) {
    clearTransporterAddInProgress(request)
    return toolkit.redirect(transporterCancelHref())
  }
  const formValues = commercialTransporterFormValuesOf(payload)
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
    transporter: {
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
