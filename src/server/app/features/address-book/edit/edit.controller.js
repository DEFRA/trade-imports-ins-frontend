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
import { addressBookPath, addressEditRoutePath } from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  buildEditCountrySelectItems,
  getAddressFormCountries
} from '../address-countries.js'
import { redirectingAddressIdRouteOptions } from '../address-id-params.js'
import { addressRules, formValuesOf } from '../fields.js'
import { boomFor, findLiveAddress, isNotFound } from '../stored-address.js'
import {
  deadLinkDestination,
  editLeaveDestinationOf,
  honouredReturnOf,
  returnDestinationOf
} from '../return-to.js'
import { setSuccessMessage } from '../success-message.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/edit/edit'
const copy = copyFor({ en, cy })

const buildView = (
  toolkit,
  {
    addressId,
    honouredReturn,
    formValues,
    countries,
    errors = {},
    recoverableError = false
  }
) =>
  toolkit.view(view, {
    ...kit.base(copy.edit.title, {
      backLink: editLeaveDestinationOf(addressId, honouredReturn),
      recoverableError
    }),
    copy,
    formValues,
    countryItems: buildEditCountrySelectItems(
      countries,
      formValues.countryCode,
      copy.form.countryPlaceholder
    ),
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const viewWithLoadedCountries = async (toolkit, model) =>
  buildView(toolkit, { ...model, countries: await getAddressFormCountries() })

const redirectAwayFromDeadLink = (toolkit, addressId, honouredReturn) =>
  toolkit.redirect(returnDestinationOf(addressId, honouredReturn))

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: addressId } = request.params
  const honouredReturn = honouredReturnOf(request)

  try {
    const address = await findLiveAddress(organisationId, addressId)
    if (!address) {
      logger.info(
        { organisationId, addressId },
        'Address not live, redirecting away from its edit page'
      )
      return redirectAwayFromDeadLink(toolkit, addressId, honouredReturn)
    }
    return buildView(toolkit, {
      addressId,
      honouredReturn,
      formValues: formValuesOf(address),
      countries: await getAddressFormCountries()
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

const rerenderAfterFailedSave = async (
  toolkit,
  err,
  { organisationId, addressId, honouredReturn, formValues }
) => {
  const model = { addressId, honouredReturn, formValues }
  if (isValidationFailure(err)) {
    logger.warn(
      { err, organisationId, addressId },
      'Address book refused the address update'
    )
    return (
      await viewWithLoadedCountries(toolkit, {
        ...model,
        errors: mapApiErrorsToFormErrors(err.body)
      })
    ).code(HTTP_STATUS_BAD_REQUEST)
  }
  logger.error(
    { err, organisationId, addressId },
    'Failed to read or update address'
  )
  return (
    await viewWithLoadedCountries(toolkit, { ...model, recoverableError: true })
  ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
}

const submitEdit = async (
  request,
  toolkit,
  { organisationId, addressId, honouredReturn, formValues }
) => {
  try {
    const address = await findLiveAddress(organisationId, addressId)
    if (!address) {
      logger.info(
        { organisationId, addressId },
        'Address not live, nothing updated'
      )
      return redirectAwayFromDeadLink(toolkit, addressId, honouredReturn)
    }
    const countries = await getAddressFormCountries()
    const { errors, value: validatedAddress } = validate(
      addressRules(countries.map((country) => country.code)),
      formValues
    )
    if (errors) {
      return buildView(toolkit, {
        addressId,
        honouredReturn,
        formValues,
        countries,
        errors
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const updatedAddress = await updateAddress(
      organisationId,
      addressId,
      validatedAddress
    )
    setSuccessMessage(request, copy.successBanner.updated(updatedAddress.name))
    return toolkit.redirect(addressBookPath())
  } catch (err) {
    if (isNotFound(err)) {
      logger.info(
        { organisationId, addressId },
        'Address already gone when updated'
      )
      return redirectAwayFromDeadLink(toolkit, addressId, honouredReturn)
    }
    if (Boom.isBoom(err)) {
      throw err
    }
    return rerenderAfterFailedSave(toolkit, err, {
      organisationId,
      addressId,
      honouredReturn,
      formValues
    })
  }
}

const post = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: addressId } = request.params
  const honouredReturn = honouredReturnOf(request)
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return toolkit.redirect(editLeaveDestinationOf(addressId, honouredReturn))
  }

  return submitEdit(request, toolkit, {
    organisationId,
    addressId,
    honouredReturn,
    formValues: formValuesOf(payload)
  })
}

export const routes = kit.pageRoutes(
  addressEditRoutePath(),
  { get, post },
  redirectingAddressIdRouteOptions(deadLinkDestination)
)
