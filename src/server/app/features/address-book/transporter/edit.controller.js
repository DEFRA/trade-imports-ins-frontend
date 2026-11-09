import Boom from '@hapi/boom'

import {
  isValidationFailure,
  mapApiErrorsToFormErrors
} from '../../../services/address-book/index.js'
import { updateTransporter } from '../../../services/transporters/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../lib/http-status.js'
import { validate } from '../../../lib/validate/index.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  transporterEditRoutePath,
  transporterPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { getAddressFormCountries } from '../address-countries.js'
import { redirectingRecordIdRouteOptions } from '../record-id-params.js'
import { boomFor, isNotFound } from '../stored-address.js'
import { findLiveTransporter } from '../stored-transporter.js'
import { honouredReturnOf, pathWithReturn } from '../return-to.js'
import { setSuccessMessage } from '../success-message.js'
import { editFormFor } from './edit-form.js'
import {
  transporterDeadLinkDestination,
  transporterReturnDestinationOf,
  transporterTabPath
} from './transporter-return.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const bundle = copyFor({ en, cy })
const copy = bundle.editTransporter

const buildView = (
  toolkit,
  {
    form,
    transporterId,
    honouredReturn,
    formValues,
    countries,
    errors = {},
    recoverableError = false
  }
) =>
  toolkit
    .view(form.view, {
      ...kit.base(copy.title, {
        backLink: pathWithReturn(
          transporterPath(transporterId),
          honouredReturn
        ),
        recoverableError
      }),
      copy,
      fieldCopy: form.fieldCopy,
      formValues,
      countryItems: form.countryItemsFor(countries, formValues.countryCode),
      fixedCountryCode: form.fixedCountryCode,
      errors,
      errorSummary: kit.errorSummary(errors)
    })
    .header('Cache-Control', 'no-store')

const redirectAwayFromDeadLink = (toolkit, transporterId, honouredReturn) =>
  toolkit.redirect(
    transporterReturnDestinationOf(transporterId, honouredReturn)
  )

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: transporterId } = request.params
  const honouredReturn = honouredReturnOf(request)

  try {
    const transporter = await findLiveTransporter(organisationId, transporterId)
    if (!transporter) {
      logger.info(
        { organisationId, transporterId },
        'Transporter not live, redirecting away from its edit page'
      )
      return redirectAwayFromDeadLink(toolkit, transporterId, honouredReturn)
    }
    const form = editFormFor(transporter.type)
    return buildView(toolkit, {
      form,
      transporterId,
      honouredReturn,
      formValues: form.formValuesOf(transporter),
      countries: await getAddressFormCountries()
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error(
        { err, organisationId, transporterId },
        'Failed to load transporter for edit'
      )
    )
  }
}

const rerenderAfterRefusedSave = async (
  toolkit,
  err,
  { organisationId, transporterId, form, honouredReturn, formValues }
) => {
  const model = {
    form,
    transporterId,
    honouredReturn,
    formValues,
    countries: await getAddressFormCountries()
  }
  if (isValidationFailure(err)) {
    logger.warn(
      { err, organisationId, transporterId },
      'Address book refused the transporter update'
    )
    return buildView(toolkit, {
      ...model,
      errors: mapApiErrorsToFormErrors(err.body)
    }).code(HTTP_STATUS_BAD_REQUEST)
  }
  logger.error(
    { err, organisationId, transporterId },
    'Failed to update transporter'
  )
  return buildView(toolkit, { ...model, recoverableError: true }).code(
    HTTP_STATUS_INTERNAL_SERVER_ERROR
  )
}

const saveEdit = async (
  request,
  toolkit,
  { organisationId, transporterId, form, honouredReturn, formValues }
) => {
  try {
    const updated = await updateTransporter(organisationId, transporterId, {
      ...formValues,
      countryCode: form.countryCodeToStore(formValues),
      type: form.storedType
    })
    setSuccessMessage(
      request,
      bundle.successBanner.transporterUpdated(updated.name)
    )
    return toolkit.redirect(transporterTabPath())
  } catch (err) {
    if (isNotFound(err)) {
      logger.info(
        { organisationId, transporterId },
        'Transporter already gone when updated'
      )
      return redirectAwayFromDeadLink(toolkit, transporterId, honouredReturn)
    }
    if (Boom.isBoom(err)) {
      throw err
    }
    return rerenderAfterRefusedSave(toolkit, err, {
      organisationId,
      transporterId,
      form,
      honouredReturn,
      formValues
    })
  }
}

const submitEdit = async (
  request,
  toolkit,
  { organisationId, transporterId, honouredReturn, payload }
) => {
  const stored = await findLiveTransporter(organisationId, transporterId)
  if (!stored) {
    logger.info(
      { organisationId, transporterId },
      'Transporter not live, nothing updated'
    )
    return redirectAwayFromDeadLink(toolkit, transporterId, honouredReturn)
  }
  const form = { ...editFormFor(stored.type), storedType: stored.type }
  const countries = await getAddressFormCountries()
  const formValues = form.formValuesOf(payload)
  const { errors } = validate(form.rulesFor(countries), {
    ...formValues,
    countryCode: (payload.countryCode ?? '').trim()
  })
  if (errors) {
    if (errors.countryCode === bundle.errors.countryFixed) {
      logger.warn(
        { organisationId, transporterId },
        'Commercial transporter edit posted a country that is not the fixed one'
      )
    }
    return buildView(toolkit, {
      form,
      transporterId,
      honouredReturn,
      formValues,
      countries,
      errors
    }).code(HTTP_STATUS_BAD_REQUEST)
  }

  return saveEdit(request, toolkit, {
    organisationId,
    transporterId,
    form,
    honouredReturn,
    formValues
  })
}

const post = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const { id: transporterId } = request.params
  const honouredReturn = honouredReturnOf(request)
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return toolkit.redirect(
      pathWithReturn(transporterPath(transporterId), honouredReturn)
    )
  }

  try {
    return await submitEdit(request, toolkit, {
      organisationId,
      transporterId,
      honouredReturn,
      payload
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error(
        { err, organisationId, transporterId },
        'Failed to read transporter for edit'
      )
    )
  }
}

export const routes = kit.pageRoutes(
  transporterEditRoutePath(),
  { get, post },
  redirectingRecordIdRouteOptions(transporterDeadLinkDestination)
)
