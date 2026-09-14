import {
  createAddress,
  isValidationFailure,
  mapApiErrorsToFormErrors
} from '../../../services/address-book/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../lib/http-status.js'
import * as kit from '../../../shared/kit.js'
import { addressAddPath, addressBookPath } from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  buildCountrySelectItems,
  getAddressFormCountries
} from '../address-countries.js'
import {
  buildAddressSchema,
  formValuesOf,
  formatValidationErrors
} from '../fields.js'
import { setSuccessBanner } from '../success-banner.js'

const logger = createLogger()
const view = 'address-book/add/template'
const PAGE_TITLE = 'Add address details'

const buildView = (h, { formValues, countryItems, errorList, fieldErrors }) =>
  h.view(view, {
    ...kit.base(PAGE_TITLE),
    heading: PAGE_TITLE,
    formValues,
    countryItems,
    errorList,
    fieldErrors
  })

const countryItemsOrNone = async () =>
  buildCountrySelectItems(await getAddressFormCountries().catch(() => []))

const get = async (request, h) => {
  try {
    const countries = await getAddressFormCountries()
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: buildCountrySelectItems(countries)
    })
  } catch (err) {
    logger.error({ err }, 'Failed to load address form countries')
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: [],
      errorList: [{ text: 'Something went wrong loading the form' }]
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
    const schema = buildAddressSchema(countries.map((country) => country.code))
    const { error, value } = schema.validate(formValues, { abortEarly: false })
    if (error) {
      return buildView(h, {
        formValues,
        countryItems: buildCountrySelectItems(countries),
        ...formatValidationErrors(error)
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const created = await createAddress(orgId, value)
    setSuccessBanner(request, `${created.name} added to your address book`)
    return h.redirect(addressBookPath())
  } catch (err) {
    if (isValidationFailure(err)) {
      return buildView(h, {
        formValues,
        countryItems: await countryItemsOrNone(),
        ...mapApiErrorsToFormErrors(err.body)
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, orgId }, 'Failed to create address')
    return buildView(h, {
      formValues,
      countryItems: await countryItemsOrNone(),
      errorList: [{ text: 'Something went wrong saving the address' }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressAddPath(), { get, post })
