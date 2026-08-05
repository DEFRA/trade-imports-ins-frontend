import { getTraceId } from '@defra/hapi-tracing'

import {
  addressBookClient,
  mapApiErrorsToFormErrors
} from '#/server/common/clients/address-book-client.js'
import { buildAddressSchema } from '../address-schema.js'
import {
  buildCountrySelectItems,
  getAddressFormCountries
} from '../address-countries.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { formatValidationErrors } from '#/server/common/helpers/validation-helpers.js'
import { setSessionValue } from '#/server/common/helpers/session-helpers.js'
import { sessionKeys } from '#/server/common/constants/session-keys.js'
import { requireOrganisationId } from '#/server/common/helpers/require-organisation-id.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

const logger = createLogger()
const VIEW = 'address-book/add/index'
const PAGE_TITLE = 'Add address details'

function emptyFormValues() {
  return {
    name: '',
    addressLine1: '',
    addressLine2: '',
    townOrCity: '',
    county: '',
    postcode: '',
    countryCode: '',
    phone: '',
    email: ''
  }
}

function payloadToFormValues(payload) {
  return {
    name: payload.name ?? '',
    addressLine1: payload.addressLine1 ?? '',
    addressLine2: payload.addressLine2 ?? '',
    townOrCity: payload.townOrCity ?? '',
    county: payload.county ?? '',
    postcode: payload.postcode ?? '',
    countryCode: payload.countryCode ?? '',
    phone: payload.phone ?? '',
    email: payload.email ?? ''
  }
}

function buildViewModel({ formValues, countryItems, errorList, fieldErrors }) {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    formValues,
    countryItems,
    errorList,
    fieldErrors
  }
}

export const addController = {
  get: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''

      try {
        const countries = await getAddressFormCountries(traceId)

        return h.view(
          VIEW,
          buildViewModel({
            formValues: emptyFormValues(),
            countryItems: buildCountrySelectItems(countries)
          })
        )
      } catch (err) {
        logger.error({ err, traceId }, 'Failed to load address form countries')
        return h
          .view(VIEW, {
            ...buildViewModel({
              formValues: emptyFormValues(),
              countryItems: []
            }),
            errorList: [{ text: 'Something went wrong loading the form' }]
          })
          .code(statusCodes.internalServerError)
      }
    }
  },
  post: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const orgId = requireOrganisationId(request)

      if (request.payload.cancel) {
        return h.redirect('/address-book')
      }

      const formValues = payloadToFormValues(request.payload)

      try {
        const countries = await getAddressFormCountries(traceId)
        const countryItems = buildCountrySelectItems(countries)
        const mdmCodes = countries.map((country) => country.code)
        const schema = buildAddressSchema(mdmCodes)

        const { error, value } = schema.validate(formValues, {
          abortEarly: false
        })

        if (error) {
          const formattedErrors = formatValidationErrors(error)
          return h
            .view(
              VIEW,
              buildViewModel({
                formValues,
                countryItems,
                errorList: formattedErrors.errorList,
                fieldErrors: formattedErrors.fieldErrors
              })
            )
            .code(statusCodes.badRequest)
        }

        const created = await addressBookClient.createAddress(
          orgId,
          traceId,
          value
        )

        setSessionValue(
          request,
          sessionKeys.addressBookSuccess,
          `${created.name} added to your address book`
        )

        return h.redirect('/address-book')
      } catch (err) {
        const status = err?.status ?? err?.output?.statusCode
        if (Number(status) === 400 && err.body?.errors) {
          const countries = await getAddressFormCountries(traceId).catch(
            () => []
          )
          const formattedErrors = mapApiErrorsToFormErrors(err.body)
          return h
            .view(
              VIEW,
              buildViewModel({
                formValues,
                countryItems: buildCountrySelectItems(countries),
                errorList: formattedErrors.errorList,
                fieldErrors: formattedErrors.fieldErrors
              })
            )
            .code(statusCodes.badRequest)
        }

        logger.error({ err, traceId, orgId }, 'Failed to create address')
        const countries = await getAddressFormCountries(traceId).catch(() => [])
        return h
          .view(VIEW, {
            ...buildViewModel({
              formValues,
              countryItems: buildCountrySelectItems(countries)
            }),
            errorList: [{ text: 'Something went wrong saving the address' }]
          })
          .code(statusCodes.internalServerError)
      }
    }
  }
}
