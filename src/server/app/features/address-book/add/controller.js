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
const view = 'address-book/add/template'
const copy = copyFor({ en, cy })

const countryItemsOf = (countries) =>
  buildCountrySelectItems(countries, copy.form.countryPlaceholder)

const buildView = (
  h,
  {
    formValues,
    countryItems,
    errors = {},
    recoverableError = false,
    handshake = null
  }
) =>
  h.view(view, {
    ...kit.base(copy.add.title, { recoverableError }),
    copy,
    formValues,
    countryItems,
    errors,
    errorSummary: kit.errorSummary(errors),
    handshakeContext: handshake
  })

const loadCountryItems = async () =>
  countryItemsOf(await getAddressFormCountries())

/**
 * Where the trader goes once the address is saved. A trader who arrived
 * through a journey handshake is returned to the journey that sent them,
 * carrying the new address; anyone else goes back to their address book.
 */
const redirectAfterAdd = (h, handshake, created) =>
  handshake
    ? h.redirect(buildReturnUrl(handshake, { addressId: created.id }))
    : h.redirect(addressBookPath())

const redirectAfterCancel = (h, handshake) =>
  handshake
    ? h.redirect(buildReturnUrl(handshake))
    : h.redirect(addressBookPath())

const get = async (request, h) => {
  const handshake = syncHandshakeContext(request)

  try {
    const countries = await getAddressFormCountries()
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: countryItemsOf(countries),
      handshake
    })
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    logger.error({ err }, 'Failed to load address form countries')
    return buildView(h, {
      formValues: formValuesOf(),
      countryItems: [],
      recoverableError: true,
      handshake
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

const submitAddress = async (request, h, { handshake, orgId, formValues }) => {
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
        errors,
        handshake
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const created = await createAddress(orgId, value)
    if (!handshake) {
      setSuccessBanner(request, copy.successBanner.added(created.name))
    }
    return redirectAfterAdd(h, handshake, created)
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    if (isValidationFailure(err)) {
      return buildView(h, {
        formValues,
        countryItems: await loadCountryItems(),
        errors: mapApiErrorsToFormErrors(err.body),
        handshake
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, orgId }, 'Failed to create address')
    return buildView(h, {
      formValues,
      countryItems: await loadCountryItems(),
      recoverableError: true,
      handshake
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

const post = async (request, h) => {
  const handshake = resolveHandshakeContext(request)
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return redirectAfterCancel(h, handshake)
  }
  const orgId = kit.requireOrganisationId(request)

  return submitAddress(request, h, {
    handshake,
    orgId,
    formValues: formValuesOf(payload)
  })
}

export const routes = kit.pageRoutes(addressAddPath(), { get, post })
