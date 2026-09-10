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
import { buildReturnUrl } from '../journey-registry.js'
import {
  resolveHandshakeContext,
  syncHandshakeContext
} from '../handshake-context.js'

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

function buildViewModel({
  formValues,
  countryItems,
  errorList,
  fieldErrors,
  handshakeContext
}) {
  return {
    pageTitle: PAGE_TITLE,
    heading: PAGE_TITLE,
    formValues,
    countryItems,
    errorList,
    fieldErrors,
    handshakeContext
  }
}

const redirectAfterAdd = (h, handshake, created) => {
  if (handshake) {
    return h.redirect(buildReturnUrl(handshake, { addressId: created.id }))
  }
  return h.redirect('/address-book')
}

const redirectAfterCancel = (h, handshake) => {
  if (handshake) {
    return h.redirect(buildReturnUrl(handshake))
  }
  return h.redirect('/address-book')
}

const renderAddForm = (
  h,
  { formValues, countryItems, errorList, fieldErrors, handshake },
  statusCode
) =>
  h
    .view(
      VIEW,
      buildViewModel({
        formValues,
        countryItems,
        errorList,
        fieldErrors,
        handshakeContext: handshake
      })
    )
    .code(statusCode)

const loadCountryItems = async (traceId) =>
  buildCountrySelectItems(await getAddressFormCountries(traceId).catch(() => []))

async function submitAddress(request, h, { traceId, handshake, orgId, formValues }) {
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
      return renderAddForm(
        h,
        {
          formValues,
          countryItems,
          errorList: formattedErrors.errorList,
          fieldErrors: formattedErrors.fieldErrors,
          handshake
        },
        statusCodes.badRequest
      )
    }

    const created = await addressBookClient.createAddress(orgId, traceId, value)

    if (!handshake) {
      setSessionValue(
        request,
        sessionKeys.addressBookSuccess,
        `${created.name} added to your address book`
      )
    }

    return redirectAfterAdd(h, handshake, created)
  } catch (err) {
    const status = err?.status ?? err?.output?.statusCode
    if (Number(status) === 400 && err.body?.errors) {
      const formattedErrors = mapApiErrorsToFormErrors(err.body)
      return renderAddForm(
        h,
        {
          formValues,
          countryItems: await loadCountryItems(traceId),
          errorList: formattedErrors.errorList,
          fieldErrors: formattedErrors.fieldErrors,
          handshake
        },
        statusCodes.badRequest
      )
    }

    logger.error({ err, traceId, orgId }, 'Failed to create address')
    return renderAddForm(
      h,
      {
        formValues,
        countryItems: await loadCountryItems(traceId),
        errorList: [{ text: 'Something went wrong saving the address' }],
        handshake
      },
      statusCodes.internalServerError
    )
  }
}

export const addController = {
  get: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const handshake = syncHandshakeContext(request)

      try {
        const countries = await getAddressFormCountries(traceId)

        return h.view(
          VIEW,
          buildViewModel({
            formValues: emptyFormValues(),
            countryItems: buildCountrySelectItems(countries),
            handshakeContext: handshake
          })
        )
      } catch (err) {
        logger.error({ err, traceId }, 'Failed to load address form countries')
        return h
          .view(VIEW, {
            ...buildViewModel({
              formValues: emptyFormValues(),
              countryItems: [],
              handshakeContext: handshake
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
      const handshake = resolveHandshakeContext(request)

      if (request.payload.cancel) {
        return redirectAfterCancel(h, handshake)
      }

      const orgId = requireOrganisationId(request)
      const formValues = payloadToFormValues(request.payload)

      return submitAddress(request, h, {
        traceId,
        handshake,
        orgId,
        formValues
      })
    }
  }
}
