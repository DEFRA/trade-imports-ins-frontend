import Boom from '@hapi/boom'
import { getTraceId } from '@defra/hapi-tracing'

import {
  getAddress,
  mapApiErrorsToFormErrors,
  updateAddress
} from '../../app/services/address-book/index.js'
import { buildAddressSchema } from '../address-schema.js'
import {
  buildCountrySelectItems,
  getAddressFormCountries
} from '../address-countries.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import { formatValidationErrors } from '../../common/helpers/validation-helpers.js'
import { setSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { requireOrganisationId } from '../../common/helpers/require-organisation-id.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const logger = createLogger()
const VIEW = 'address-book/edit/index'
const PAGE_TITLE = 'Edit address details'

function addressToFormValues(address) {
  return {
    name: address.name ?? '',
    addressLine1: address.addressLine1 ?? '',
    addressLine2: address.addressLine2 ?? '',
    townOrCity: address.townOrCity ?? '',
    county: address.county ?? '',
    postcode: address.postcode ?? '',
    countryCode: address.countryCode ?? '',
    phone: address.phone ?? '',
    email: address.email ?? ''
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

function buildViewModel({
  id,
  formValues,
  countryItems,
  errorList,
  fieldErrors
}) {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    id,
    formValues,
    countryItems,
    errorList,
    fieldErrors
  }
}

async function renderEditForm(h, { id, formValues, errorList, fieldErrors }) {
  const countries = await getAddressFormCountries().catch(() => [])

  return h.view(
    VIEW,
    buildViewModel({
      id,
      formValues,
      countryItems: buildCountrySelectItems(countries),
      errorList,
      fieldErrors
    })
  )
}

export const editController = {
  get: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const orgId = requireOrganisationId(request)
      const { id } = request.params

      try {
        const address = await getAddress(orgId, id)

        if (address.deleted) {
          throw Boom.notFound()
        }

        const countries = await getAddressFormCountries()

        return h.view(
          VIEW,
          buildViewModel({
            id,
            formValues: addressToFormValues(address),
            countryItems: buildCountrySelectItems(countries)
          })
        )
      } catch (err) {
        if (err.isBoom) {
          throw err
        }

        if (err.status === statusCodes.notFound) {
          throw Boom.notFound()
        }

        logger.error(
          { err, traceId, orgId, id },
          'Failed to load address for edit'
        )
        throw Boom.internal()
      }
    }
  },
  post: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const orgId = requireOrganisationId(request)
      const { id } = request.params

      if (request.payload.cancel) {
        return h.redirect('/address-book')
      }

      const formValues = payloadToFormValues(request.payload)

      try {
        const countries = await getAddressFormCountries()
        const mdmCodes = countries.map((country) => country.code)
        const schema = buildAddressSchema(mdmCodes)

        const { error, value } = schema.validate(formValues, {
          abortEarly: false
        })

        if (error) {
          const formattedErrors = formatValidationErrors(error)
          return (
            await renderEditForm(h, {
              id,
              formValues,
              errorList: formattedErrors.errorList,
              fieldErrors: formattedErrors.fieldErrors
            })
          ).code(statusCodes.badRequest)
        }

        const updated = await updateAddress(orgId, id, value)

        setSessionValue(
          request,
          sessionKeys.addressBookSuccess,
          `${updated.name} updated in your address book`
        )

        return h.redirect('/address-book')
      } catch (err) {
        if (err.isBoom) {
          throw err
        }

        if (err.status === statusCodes.notFound) {
          throw Boom.notFound()
        }

        if (err.status === 400 && err.body?.errors) {
          const formattedErrors = mapApiErrorsToFormErrors(err.body)
          return (
            await renderEditForm(h, {
              id,
              formValues,
              errorList: formattedErrors.errorList,
              fieldErrors: formattedErrors.fieldErrors
            })
          ).code(statusCodes.badRequest)
        }

        logger.error({ err, traceId, orgId, id }, 'Failed to update address')
        return (
          await renderEditForm(h, {
            id,
            formValues,
            errorList: [{ text: 'Something went wrong saving the address' }]
          })
        ).code(statusCodes.internalServerError)
      }
    }
  }
}
