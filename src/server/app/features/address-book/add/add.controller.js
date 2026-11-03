import Boom from '@hapi/boom'

import {
  USES_BY_ADDRESS_TYPE,
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
import {
  addressAddPath,
  addressBookPath,
  addressTypePath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { clearAddInProgress, chosenAddressType } from '../add-in-progress.js'
import { addFormCountryOffer, GB_COUNTRY } from '../address-countries.js'
import {
  addressRules,
  formValuesOf,
  keepUsesOfferedBy,
  postedUsesOf,
  usesErrorsOf
} from '../fields.js'
import { setSuccessMessage } from '../success-message.js'
import {
  resolveHandshakeContext,
  syncHandshakeContext
} from '../handshake-context.js'
import {
  ADDRESS_LANDING,
  addressTypeAndUsesOfParty,
  buildReturnUrl,
  isConsignmentContact
} from '../journey-registry.js'
import { addressBookPageHref } from '../view-model/list.js'
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
    ? addressTypePath()
    : buildReturnUrl(handshakeContext)

const openingFormValuesFor = (addMode) =>
  formValuesOf(
    addMode === ADD_MODES.ADDRESS_BOOK ? { countryCode: GB_COUNTRY.code } : {}
  )

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

const useItemsOf = (addressType, tickedUses) =>
  USES_BY_ADDRESS_TYPE[addressType].map((use) => ({
    value: use,
    text: copy.uses.options[use].label,
    checked: tickedUses.includes(use)
  }))

const buildView = (
  toolkit,
  {
    formValues,
    countryItems,
    errors = {},
    recoverableError = false,
    handshakeContext = null,
    addressType,
    postedUses = []
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
      useItems:
        addMode === ADD_MODES.ADDRESS_BOOK
          ? useItemsOf(addressType, postedUses)
          : [],
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

const redirectIfNoAddressTypeChosen = (request, toolkit, addMode) => {
  if (addMode !== ADD_MODES.ADDRESS_BOOK || chosenAddressType(request)) {
    return undefined
  }
  logger.info(
    {
      organisationId: kit.requireOrganisationId(request),
      path: request.path
    },
    'No address type chosen, sending the user to choose one'
  )
  return toolkit.redirect(addressTypePath())
}

const get = async (request, toolkit) => {
  const handshakeContext = syncHandshakeContext(request)
  const addMode = addModeFor(handshakeContext)

  const redirectToTypePage = redirectIfNoAddressTypeChosen(
    request,
    toolkit,
    addMode
  )
  if (redirectToTypePage) {
    return redirectToTypePage
  }

  const { countryItems, formValues } = await addFormCountryOffer({
    handshakeContext,
    placeholder: copy.form.countryPlaceholder,
    formValues: openingFormValuesFor(addMode)
  })

  return buildView(toolkit, {
    formValues,
    countryItems,
    handshakeContext,
    addressType: chosenAddressType(request)
  })
}

const logDiscardedUses = ({
  organisationId,
  addressType,
  postedUses,
  keptUses
}) => {
  const discardedUses = postedUses.filter((use) => !keptUses.includes(use))
  if (discardedUses.length > 0) {
    logger.info(
      { organisationId, addressType, discardedUses },
      'Posted uses the chosen address type does not offer were not saved'
    )
  }
}

const typeAndUsesToSave = (handshakeContext, { addressType, postedUses }) =>
  addModeFor(handshakeContext) === ADD_MODES.ADDRESS_BOOK
    ? { addressType, uses: keepUsesOfferedBy(addressType, postedUses) }
    : addressTypeAndUsesOfParty(handshakeContext)

const submitAddress = async (
  request,
  toolkit,
  {
    handshakeContext,
    organisationId,
    postedValues,
    postedUses,
    addressType,
    landing
  }
) => {
  const { countryItems, countryCodes, formValues } = await addFormCountryOffer({
    handshakeContext,
    placeholder: copy.form.countryPlaceholder,
    formValues: postedValues
  })
  const rerender = (model) =>
    buildView(toolkit, {
      formValues,
      countryItems,
      handshakeContext,
      addressType,
      postedUses,
      ...model
    })
  try {
    const { errors, value: validatedAddress } = validate(
      addressRules(countryCodes),
      formValues
    )
    if (errors) {
      return rerender({ errors }).code(HTTP_STATUS_BAD_REQUEST)
    }
    const isAddressBookAdd =
      addModeFor(handshakeContext) === ADD_MODES.ADDRESS_BOOK
    const typeAndUses = typeAndUsesToSave(handshakeContext, {
      addressType,
      postedUses
    })
    if (isAddressBookAdd) {
      logDiscardedUses({
        organisationId,
        addressType,
        postedUses,
        keptUses: typeAndUses.uses
      })
      const usesErrors = usesErrorsOf(typeAndUses.uses)
      if (usesErrors) {
        return rerender({ errors: usesErrors }).code(HTTP_STATUS_BAD_REQUEST)
      }
    }
    const createdAddress = await createAddress(organisationId, {
      ...validatedAddress,
      ...typeAndUses
    })
    if (!isAddressBookAdd) {
      return handBackAddress(toolkit, handshakeContext, {
        organisationId,
        addressId: createdAddress.id,
        landing
      })
    }
    clearAddInProgress(request)
    setSuccessMessage(request, copy.successBanner.added(createdAddress.name))
    return toolkit.redirect(addressBookPageHref(1, { addressType }))
  } catch (err) {
    if (Boom.isBoom(err)) {
      throw err
    }
    if (isValidationFailure(err)) {
      logger.warn(
        { err, organisationId },
        'Address book refused the new address'
      )
      return rerender({ errors: mapApiErrorsToFormErrors(err.body) }).code(
        HTTP_STATUS_BAD_REQUEST
      )
    }
    logger.error({ err, organisationId }, 'Failed to create address')
    return rerender({ recoverableError: true }).code(
      HTTP_STATUS_INTERNAL_SERVER_ERROR
    )
  }
}

const post = async (request, toolkit) => {
  const handshakeContext = resolveHandshakeContext(request)
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return redirectAfterCancel(toolkit, handshakeContext)
  }
  const redirectToTypePage = redirectIfNoAddressTypeChosen(
    request,
    toolkit,
    addModeFor(handshakeContext)
  )
  if (redirectToTypePage) {
    return redirectToTypePage
  }
  const organisationId = kit.requireOrganisationId(request)

  return submitAddress(request, toolkit, {
    handshakeContext,
    organisationId,
    postedValues: formValuesOf(payload),
    postedUses: postedUsesOf(payload),
    addressType: chosenAddressType(request),
    landing: landingChosenBy(payload)
  })
}

export const routes = kit.pageRoutes(addressAddPath(), { get, post })
