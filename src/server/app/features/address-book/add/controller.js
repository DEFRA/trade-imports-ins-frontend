import {
  createAddress,
  isValidationFailure,
  mapApiErrorsToFormErrors
} from '../../../services/address-book/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../lib/http-status.js'
import { validate } from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import { addressAddPath, addressBookPath } from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  buildCountrySelectItems,
  getAddressFormCountries
} from '../address-countries.js'
import { addressRules, formValuesOf } from '../fields.js'
import { setSuccessBanner } from '../success-banner.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/add/template'
const copy = copyFor({ en, cy })

const countryItemsOf = (countries) =>
  buildCountrySelectItems(countries, copy.form.countryPlaceholder)

const buildView = (h, { formValues, countryItems, errors = {}, errorList }) =>
  h.view(view, {
    ...kit.base(copy.add.title),
    copy,
    formValues,
    countryItems,
    errors,
    errorSummary: kit.errorSummary(errors),
    errorList
  })

const countryItemsOrNone = async () =>
  countryItemsOf(await getAddressFormCountries().catch(() => []))

const get = async (_request, h) => {
  try {
    const countries = await getAddressFormCountries()
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: countryItemsOf(countries)
    })
  } catch (err) {
    logger.error({ err }, 'Failed to load address form countries')
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: [],
      errorList: [{ text: copy.errors.loadForm }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

const post = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return h.redirect(addressBookPath())
  }
  const formValues = formValuesOf(payload)

  try {
    const countries = await getAddressFormCountries()
    const { errors, value } = validate(
      addressRules(countries.map((country) => country.code)),
      formValues
    )
    if (errors) {
      return buildView(h, {
        formValues,
        countryItems: countryItemsOf(countries),
        errors
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const created = await createAddress(orgId, value)
    setSuccessBanner(request, copy.successBanner.added(created.name))
    return h.redirect(addressBookPath())
  } catch (err) {
    if (isValidationFailure(err)) {
      return buildView(h, {
        formValues,
        countryItems: await countryItemsOrNone(),
        errors: mapApiErrorsToFormErrors(err.body)
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, orgId }, 'Failed to create address')
    return buildView(h, {
      formValues,
      countryItems: await countryItemsOrNone(),
      errorList: [{ text: copy.errors.save }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressAddPath(), { get, post })
