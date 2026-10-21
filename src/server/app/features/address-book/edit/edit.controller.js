import Boom from '@hapi/boom'

import {
  isValidationFailure,
  mapApiErrorsToFormErrors,
  updateAddress
} from '../../../services/address-book/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
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
import { boomFor, isNotFound, loadStoredAddress } from '../stored-address.js'
import { setSuccessBanner } from '../success-banner.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/edit/edit'
const copy = copyFor({ en, cy })

const countryItemsOf = (countries) =>
  buildCountrySelectItems(countries, copy.form.countryPlaceholder)

const buildView = (
  toolkit,
  { addressId, formValues, countryItems, errors = {}, recoverableError = false }
) =>
  toolkit.view(view, {
    ...kit.base(copy.edit.title, {
      backLink: addressPath(addressId),
      recoverableError
    }),
    copy,
    formValues,
    countryItems,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const loadCountryItems = async () =>
  countryItemsOf(await getAddressFormCountries())

const rejected = async (toolkit, model) =>
  buildView(toolkit, { ...model, countryItems: await loadCountryItems() })

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: addressId } = request.params

  try {
    const address = await loadStoredAddress(organisationId, addressId)
    const countries = await getAddressFormCountries()
    return buildView(toolkit, {
      addressId,
      formValues: formValuesOf(address),
      countryItems: countryItemsOf(countries)
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error(
        { err, organisationId, addressId },
        'Failed to load address for edit'
      )
    )
  }
}

const post = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: addressId } = request.params
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return toolkit.redirect(addressBookPath())
  }
  const formValues = formValuesOf(payload)

  try {
    const countries = await getAddressFormCountries()
    const { errors, value } = validate(
      addressRules(countries.map((country) => country.code)),
      formValues
    )
    if (errors) {
      return buildView(toolkit, {
        addressId,
        formValues,
        countryItems: countryItemsOf(countries),
        errors
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const updated = await updateAddress(organisationId, addressId, value)
    setSuccessBanner(request, copy.successBanner.updated(updated.name))
    return toolkit.redirect(addressBookPath())
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    if (isNotFound(err)) {
      throw Boom.notFound()
    }
    if (isValidationFailure(err)) {
      return (
        await rejected(toolkit, {
          addressId,
          formValues,
          errors: mapApiErrorsToFormErrors(err.body)
        })
      ).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, organisationId, addressId }, 'Failed to update address')
    return (
      await rejected(toolkit, {
        addressId,
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
