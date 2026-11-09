import { TRANSPORTER_TYPES } from '../../../services/transporters/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import { privateTransporterPath } from '../../../shared/paths.js'
import {
  buildCountrySelectItems,
  getAddressFormCountries
} from '../address-countries.js'
import {
  transporterFieldRuleFor,
  transporterFormValuesOf
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

const view = 'address-book/transporter/private-transporter'
const bundle = copyFor({ en, cy })
const copy = bundle.privateTransporterForm
const errors = bundle.errors

const privateTransporterRules = (countryCodes) =>
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
    requiredOneOf('countryCode', countryCodes, errors.countryCode.required)
  )

const formValuesWithCountryCode = (payload) => ({
  ...transporterFormValuesOf(payload),
  countryCode: (payload.countryCode ?? '').trim()
})

const buildView = async (
  toolkit,
  { formValues, errors: fieldErrors = {}, recoverableError = false }
) => {
  const countries = await getAddressFormCountries()
  return toolkit
    .view(view, {
      ...kit.base(copy.title, {
        backLink: transporterFormBackHref(),
        recoverableError
      }),
      copy,
      formValues,
      countryItems: buildCountrySelectItems(countries, copy.countryPlaceholder),
      errors: fieldErrors,
      errorSummary: kit.errorSummary(fieldErrors),
      cancelLabel: transporterCancelLabel(TRANSPORTER_TYPES.PRIVATE)
    })
    .header('Cache-Control', 'no-store')
}

const get = async (request, toolkit) => {
  const redirect = redirectUnlessOwnTransporterType(
    request,
    toolkit,
    TRANSPORTER_TYPES.PRIVATE
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
    TRANSPORTER_TYPES.PRIVATE
  )
  if (redirect) {
    return redirect
  }
  const payload = request.payload ?? {}
  if (payload.cancel) {
    clearTransporterAddInProgress(request)
    return toolkit.redirect(transporterCancelHref())
  }
  const countries = await getAddressFormCountries()
  const formValues = formValuesWithCountryCode(payload)
  storeEnteredTransporter(request, formValues)

  const { errors: fieldErrors } = validate(
    privateTransporterRules(countries.map((country) => country.code)),
    formValues
  )
  if (fieldErrors) {
    return (await buildView(toolkit, { formValues, errors: fieldErrors })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  return saveTransporter(request, toolkit, {
    transporter: { ...formValues, type: TRANSPORTER_TYPES.PRIVATE },
    formValues,
    buildView
  })
}

export const routes = kit.pageRoutes(privateTransporterPath(), { get, post })
