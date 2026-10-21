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
  buildCountrySelectItems(countries, copy.add.countryPlaceholder)

const buildView = (
  toolkit,
  {
    formValues,
    countryItems,
    errors = {},
    recoverableError = false,
    handshake = null
  }
) =>
  toolkit
    .view(view, {
      ...kit.base(copy.add.title, {
        recoverableError,
        backLink: handshake ? undefined : addressBookPath()
      }),
      copy,
      formValues,
      countryItems,
      errors,
      errorSummary: kit.errorSummary(errors),
      handshakeContext: handshake,
      cancelHref: handshake ? null : addressBookPath()
    })
    .header('Cache-Control', 'no-store')

const loadCountryItems = async () =>
  countryItemsOf(await getAddressFormCountries())

const redirectAfterAdd = (toolkit, handshake, created) =>
  handshake
    ? toolkit.redirect(buildReturnUrl(handshake, { addressId: created.id }))
    : toolkit.redirect(addressBookPath())

const redirectAfterCancel = (toolkit, handshake) =>
  handshake
    ? toolkit.redirect(buildReturnUrl(handshake))
    : toolkit.redirect(addressBookPath())

const get = async (request, toolkit) => {
  const handshake = syncHandshakeContext(request)

  const formValues = formValuesOf()

  try {
    const countries = await getAddressFormCountries()
    return buildView(toolkit, {
      formValues,
      countryItems: countryItemsOf(countries),
      handshake
    })
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    logger.error({ err }, 'Failed to load address form countries')
    return buildView(toolkit, {
      formValues,
      countryItems: [],
      recoverableError: true,
      handshake
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

const submitAddress = async (
  request,
  toolkit,
  { handshake, organisationId, formValues }
) => {
  try {
    const countries = await getAddressFormCountries()
    const { errors, value } = validate(
      addressRules(countries.map((country) => country.code)),
      formValues
    )
    if (errors) {
      return buildView(toolkit, {
        formValues,
        countryItems: countryItemsOf(countries),
        errors,
        handshake
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const created = await createAddress(organisationId, value)
    if (!handshake) {
      setSuccessBanner(request, copy.successBanner.added(created.name))
    }
    return redirectAfterAdd(toolkit, handshake, created)
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    if (isValidationFailure(err)) {
      return buildView(toolkit, {
        formValues,
        countryItems: await loadCountryItems(),
        errors: mapApiErrorsToFormErrors(err.body),
        handshake
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, organisationId }, 'Failed to create address')
    return buildView(toolkit, {
      formValues,
      countryItems: await loadCountryItems(),
      recoverableError: true,
      handshake
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

const post = async (request, toolkit) => {
  const handshake = resolveHandshakeContext(request)
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return redirectAfterCancel(toolkit, handshake)
  }
  const organisationId = kit.requireOrganisationId(request)

  return submitAddress(request, toolkit, {
    handshake,
    organisationId,
    formValues: formValuesOf(payload)
  })
}

export const routes = kit.pageRoutes(addressAddPath(), { get, post })
