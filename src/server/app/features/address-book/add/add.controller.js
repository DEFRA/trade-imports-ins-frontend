import Boom from '@hapi/boom'

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
import { setSuccessMessage } from '../success-message.js'
import {
  resolveHandshakeContext,
  syncHandshakeContext
} from '../handshake-context.js'
import { buildReturnUrl } from '../journey-registry.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/add/add'
const copy = copyFor({ en, cy })

const countryItemsOf = (countries) =>
  buildCountrySelectItems(countries, copy.form.countryPlaceholder)

const buildView = (
  toolkit,
  {
    formValues,
    countryItems,
    errors = {},
    recoverableError = false,
    handshakeContext = null
  }
) =>
  toolkit
    .view(view, {
      ...kit.base(copy.add.title, {
        recoverableError,
        backLink: handshakeContext ? undefined : addressBookPath()
      }),
      copy,
      formValues,
      countryItems,
      errors,
      errorSummary: kit.errorSummary(errors),
      handshakeContext,
      cancelHref: handshakeContext ? null : addressBookPath()
    })
    .header('Cache-Control', 'no-store')

const loadCountryItems = async () =>
  countryItemsOf(await getAddressFormCountries())

const redirectAfterAdd = (toolkit, handshakeContext, createdAddress) =>
  handshakeContext
    ? toolkit.redirect(
        buildReturnUrl(handshakeContext, { addressId: createdAddress.id })
      )
    : toolkit.redirect(addressBookPath())

const redirectAfterCancel = (toolkit, handshakeContext) =>
  handshakeContext
    ? toolkit.redirect(buildReturnUrl(handshakeContext))
    : toolkit.redirect(addressBookPath())

const get = async (request, toolkit) => {
  const handshakeContext = syncHandshakeContext(request)

  const formValues = formValuesOf()

  try {
    return buildView(toolkit, {
      formValues,
      countryItems: await loadCountryItems(),
      handshakeContext
    })
  } catch (err) {
    if (Boom.isBoom(err)) {
      throw err
    }
    logger.error({ err }, 'Failed to load address form countries')
    return buildView(toolkit, {
      formValues,
      countryItems: [],
      recoverableError: true,
      handshakeContext
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

const submitAddress = async (
  request,
  toolkit,
  { handshakeContext, organisationId, formValues }
) => {
  try {
    const countries = await getAddressFormCountries()
    const { errors, value: validatedAddress } = validate(
      addressRules(countries.map((country) => country.code)),
      formValues
    )
    if (errors) {
      return buildView(toolkit, {
        formValues,
        countryItems: countryItemsOf(countries),
        errors,
        handshakeContext
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const createdAddress = await createAddress(organisationId, validatedAddress)
    if (!handshakeContext) {
      setSuccessMessage(request, copy.successBanner.added(createdAddress.name))
    }
    return redirectAfterAdd(toolkit, handshakeContext, createdAddress)
  } catch (err) {
    if (Boom.isBoom(err)) {
      throw err
    }
    if (isValidationFailure(err)) {
      logger.warn(
        { err, organisationId },
        'Address book refused the new address'
      )
      return buildView(toolkit, {
        formValues,
        countryItems: await loadCountryItems(),
        errors: mapApiErrorsToFormErrors(err.body),
        handshakeContext
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, organisationId }, 'Failed to create address')
    return buildView(toolkit, {
      formValues,
      countryItems: await loadCountryItems(),
      recoverableError: true,
      handshakeContext
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

const post = async (request, toolkit) => {
  const handshakeContext = resolveHandshakeContext(request)
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return redirectAfterCancel(toolkit, handshakeContext)
  }
  const organisationId = kit.requireOrganisationId(request)

  return submitAddress(request, toolkit, {
    handshakeContext,
    organisationId,
    formValues: formValuesOf(payload)
  })
}

export const routes = kit.pageRoutes(addressAddPath(), { get, post })
