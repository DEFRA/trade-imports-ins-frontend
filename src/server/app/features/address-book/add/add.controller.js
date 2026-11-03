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
import { addFormCountryOffer } from '../address-countries.js'
import { addressRules, formValuesOf } from '../fields.js'
import { setSuccessMessage } from '../success-message.js'
import {
  resolveHandshakeContext,
  syncHandshakeContext
} from '../handshake-context.js'
import {
  ADDRESS_LANDING,
  buildReturnUrl,
  isConsignmentContact
} from '../journey-registry.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/add/add'
const copy = copyFor({ en, cy })

const ADD_MODES = Object.freeze({
  ADDRESS_BOOK: 'address-book',
  ROLE_HANDSHAKE: 'role-handshake',
  CONSIGNMENT_CONTACT: 'consignment-contact'
})

const addModeFor = (handshakeContext) => {
  if (!handshakeContext) {
    return ADD_MODES.ADDRESS_BOOK
  }
  return isConsignmentContact(handshakeContext)
    ? ADD_MODES.CONSIGNMENT_CONTACT
    : ADD_MODES.ROLE_HANDSHAKE
}

const backHrefFor = (addMode, handshakeContext) =>
  addMode === ADD_MODES.ADDRESS_BOOK
    ? addressBookPath()
    : buildReturnUrl(handshakeContext)

const cancelUrlFor = (addMode, handshakeContext) => {
  switch (addMode) {
    case ADD_MODES.ROLE_HANDSHAKE:
      return buildReturnUrl(handshakeContext, {
        landing: ADDRESS_LANDING.CANCEL
      })
    case ADD_MODES.CONSIGNMENT_CONTACT:
      return buildReturnUrl(handshakeContext)
    default:
      return addressBookPath()
  }
}

const landingChosenBy = (payload) =>
  payload.action === ADDRESS_LANDING.RETURN
    ? ADDRESS_LANDING.RETURN
    : ADDRESS_LANDING.SELECT

const buildView = (
  toolkit,
  {
    formValues,
    countryItems,
    errors = {},
    recoverableError = false,
    handshakeContext = null
  }
) => {
  const addMode = addModeFor(handshakeContext)
  return toolkit
    .view(view, {
      ...kit.base(copy.add.title, {
        recoverableError,
        backLink: backHrefFor(addMode, handshakeContext),
        journeyStrip:
          addMode === ADD_MODES.ADDRESS_BOOK
            ? null
            : kit.draftJourneyStrip(handshakeContext.notificationId)
      }),
      copy,
      formValues,
      countryItems,
      errors,
      errorSummary: kit.errorSummary(errors),
      handshakeContext,
      addMode,
      addModes: ADD_MODES,
      addressLanding: ADDRESS_LANDING,
      cancelHref: cancelUrlFor(addMode, handshakeContext)
    })
    .header('Cache-Control', 'no-store')
}

const handBackAddress = (
  toolkit,
  handshakeContext,
  { organisationId, addressId, landing }
) => {
  logger.info(
    {
      organisationId,
      addressId,
      notificationId: handshakeContext.notificationId,
      fulfilmentId: handshakeContext.fulfilmentId,
      landing
    },
    'Address handed back to the journey'
  )
  return toolkit.redirect(
    buildReturnUrl(handshakeContext, { addressId, landing })
  )
}

const redirectAfterCancel = (toolkit, handshakeContext) => {
  const addMode = addModeFor(handshakeContext)
  if (addMode !== ADD_MODES.ADDRESS_BOOK) {
    logger.info(
      {
        notificationId: handshakeContext.notificationId,
        fulfilmentId: handshakeContext.fulfilmentId
      },
      'Cancel handed back to the journey'
    )
  }
  return toolkit.redirect(cancelUrlFor(addMode, handshakeContext))
}

const get = async (request, toolkit) => {
  const handshakeContext = syncHandshakeContext(request)

  const { countryItems, formValues } = await addFormCountryOffer({
    handshakeContext,
    placeholder: copy.form.countryPlaceholder,
    formValues: formValuesOf()
  })

  return buildView(toolkit, { formValues, countryItems, handshakeContext })
}

const submitAddress = async (
  request,
  toolkit,
  { handshakeContext, organisationId, postedValues, landing }
) => {
  const { countryItems, countryCodes, formValues } = await addFormCountryOffer({
    handshakeContext,
    placeholder: copy.form.countryPlaceholder,
    formValues: postedValues
  })
  try {
    const { errors, value: validatedAddress } = validate(
      addressRules(countryCodes),
      formValues
    )
    if (errors) {
      return buildView(toolkit, {
        formValues,
        countryItems,
        errors,
        handshakeContext
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const createdAddress = await createAddress(organisationId, validatedAddress)
    if (addModeFor(handshakeContext) !== ADD_MODES.ADDRESS_BOOK) {
      return handBackAddress(toolkit, handshakeContext, {
        organisationId,
        addressId: createdAddress.id,
        landing
      })
    }
    setSuccessMessage(request, copy.successBanner.added(createdAddress.name))
    return toolkit.redirect(addressBookPath())
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
        countryItems,
        errors: mapApiErrorsToFormErrors(err.body),
        handshakeContext
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, organisationId }, 'Failed to create address')
    return buildView(toolkit, {
      formValues,
      countryItems,
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
    postedValues: formValuesOf(payload),
    landing: landingChosenBy(payload)
  })
}

export const routes = kit.pageRoutes(addressAddPath(), { get, post })
