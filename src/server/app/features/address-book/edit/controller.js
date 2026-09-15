import Boom from '@hapi/boom'

import {
  isValidationFailure,
  mapApiErrorsToFormErrors,
  updateAddress
} from '../../../services/address-book/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_FOUND
} from '../../../lib/http-status.js'
import { validate } from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  addressBookPath,
  addressEditRoutePath,
  addressPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  buildCountrySelectItems,
  getAddressFormCountries
} from '../address-countries.js'
import { addressIdRouteOptions } from '../address-id-params.js'
import { addressRules, formValuesOf } from '../fields.js'
import { boomFor, loadStoredAddress } from '../stored-address.js'
import { setSuccessBanner } from '../success-banner.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/edit/template'
const copy = copyFor({ en, cy })

const countryItemsOf = (countries) =>
  buildCountrySelectItems(countries, copy.form.countryPlaceholder)

const buildView = (
  h,
  { id, formValues, countryItems, errors = {}, recoverableError = false }
) =>
  h.view(view, {
    ...kit.base(copy.edit.title, {
      backLink: addressPath(id),
      recoverableError
    }),
    copy,
    formValues,
    countryItems,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const countryItemsOrNone = async () =>
  countryItemsOf(await getAddressFormCountries().catch(() => []))

const rejected = async (h, model) =>
  buildView(h, { ...model, countryItems: await countryItemsOrNone() })

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await loadStoredAddress(orgId, id)
    const countries = await getAddressFormCountries()
    return buildView(h, {
      id,
      formValues: formValuesOf(address),
      countryItems: countryItemsOf(countries)
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error({ err, orgId, id }, 'Failed to load address for edit')
    )
  }
}

const post = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params
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
        id,
        formValues,
        countryItems: countryItemsOf(countries),
        errors
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const updated = await updateAddress(orgId, id, value)
    setSuccessBanner(request, copy.successBanner.updated(updated.name))
    return h.redirect(addressBookPath())
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    if (err.status === HTTP_STATUS_NOT_FOUND) {
      throw Boom.notFound()
    }
    if (isValidationFailure(err)) {
      return (
        await rejected(h, {
          id,
          formValues,
          errors: mapApiErrorsToFormErrors(err.body)
        })
      ).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, orgId, id }, 'Failed to update address')
    return (
      await rejected(h, {
        id,
        formValues,
        recoverableError: true
      })
    ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(
  addressEditRoutePath(),
  { get, post },
  addressIdRouteOptions
)
