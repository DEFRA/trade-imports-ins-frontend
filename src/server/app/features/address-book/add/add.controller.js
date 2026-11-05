import Boom from '@hapi/boom'

import {
  PLACE_ROLES,
  ROLES_BY_ADDRESS_TYPE,
  createAddress,
  isValidationFailure,
  keepRolesOfferedBy,
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
import {
  storedChosenAddressType,
  clearAddInProgress,
  storeEnteredAddress,
  storedEnteredAddress
} from '../add-in-progress.js'
import { addFormCountryOffer, GB_COUNTRY } from '../address-countries.js'
import {
  addressRules,
  formValuesOf,
  postedRolesOf,
  rolesErrorsOf
} from '../fields.js'
import { setSuccessMessage } from '../success-message.js'
import {
  resolveHandshakeContext,
  syncHandshakeContext
} from '../handshake-context.js'
import {
  ADDRESS_LANDING,
  rolesOfParty,
  buildReturnUrl,
  isConsignmentContact,
  ownAndOtherRolesOfParty
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

const openingEntryFor = (request, addMode) => {
  if (addMode !== ADD_MODES.ADDRESS_BOOK) {
    return { formValues: formValuesOf(), tickedRoles: [] }
  }
  const { formValues, tickedRoles } = storedEnteredAddress(request)
  return {
    formValues: formValues ?? formValuesOf({ countryCode: GB_COUNTRY.code }),
    tickedRoles
  }
}

const addressBookAddressTypeOf = (request, addMode) =>
  addMode === ADD_MODES.ADDRESS_BOOK
    ? storedChosenAddressType(request)
    : undefined

const storeAddressBookEntry = (
  request,
  { addMode, addressType, postedValues, postedRoles }
) => {
  if (addMode === ADD_MODES.ADDRESS_BOOK) {
    storeEnteredAddress(request, {
      formValues: postedValues,
      tickedRoles: keepRolesOfferedBy(addressType, postedRoles)
    })
  }
}

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

const placeRolesFirst = (roles) => [
  ...roles.filter((role) => PLACE_ROLES.includes(role)),
  ...roles.filter((role) => !PLACE_ROLES.includes(role))
]

const roleItemsOf = (roles, tickedRoles) =>
  roles.map((role) => ({
    value: role,
    text: copy.roles.options[role].label,
    checked: tickedRoles.includes(role)
  }))

const rolesQuestionFor = (
  addMode,
  handshakeContext,
  { addressType, tickedRoles }
) => {
  if (addMode === ADD_MODES.ADDRESS_BOOK) {
    return {
      legend: copy.roles.legendByAddressType[addressType],
      hint: copy.roles.hint,
      items: roleItemsOf(
        placeRolesFirst(ROLES_BY_ADDRESS_TYPE[addressType]),
        tickedRoles
      )
    }
  }
  const { ownRole, otherRoles } = ownAndOtherRolesOfParty(handshakeContext)
  if (otherRoles.length === 0) {
    return null
  }
  return {
    legend: copy.roles.journeyLegend,
    hint: copy.roles.journeyHint(copy.roles.options[ownRole].label),
    items: roleItemsOf(otherRoles, tickedRoles)
  }
}

const buildView = (
  toolkit,
  {
    addMode,
    formValues,
    countryItems,
    errors = {},
    recoverableError = false,
    handshakeContext = null,
    addressType,
    tickedRoles = []
  }
) =>
  toolkit
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
      rolesQuestion: rolesQuestionFor(addMode, handshakeContext, {
        addressType,
        tickedRoles
      }),
      errors,
      errorSummary: kit.errorSummary(errors),
      handshakeContext,
      addMode,
      addModes: ADD_MODES,
      addressLanding: ADDRESS_LANDING,
      cancelHref: cancelUrlFor(addMode, handshakeContext)
    })
    .header('Cache-Control', 'no-store')

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

const redirectAfterCancel = (toolkit, { addMode, handshakeContext }) => {
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
  if (addMode !== ADD_MODES.ADDRESS_BOOK || storedChosenAddressType(request)) {
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

  const addressType = addressBookAddressTypeOf(request, addMode)
  const { formValues: openingFormValues, tickedRoles } = openingEntryFor(
    request,
    addMode
  )
  const { countryItems, formValues } = await addFormCountryOffer({
    handshakeContext,
    addressType,
    placeholder: copy.form.countryPlaceholder,
    formValues: openingFormValues
  })

  return buildView(toolkit, {
    addMode,
    formValues,
    countryItems,
    handshakeContext,
    addressType,
    tickedRoles
  })
}

const addIdsForLog = (handshakeContext, addressType) =>
  handshakeContext
    ? {
        notificationId: handshakeContext.notificationId,
        fulfilmentId: handshakeContext.fulfilmentId
      }
    : { addressType }

const logReplacedCountry = ({
  handshakeContext,
  organisationId,
  addressId,
  addressType,
  postedCountryCode,
  storedCountryCode
}) => {
  if (
    String(postedCountryCode).trim() === '' ||
    postedCountryCode === storedCountryCode
  ) {
    return
  }
  logger.info(
    {
      organisationId,
      addressId,
      ...addIdsForLog(handshakeContext, addressType),
      postedCountryCode
    },
    'Posted country was replaced with the country the address must be in'
  )
}

const logDiscardedRoles = ({
  handshakeContext,
  organisationId,
  addressType,
  postedRoles,
  keptRoles
}) => {
  const discardedRoles = postedRoles.filter((role) => !keptRoles.includes(role))
  if (discardedRoles.length > 0) {
    logger.info(
      {
        organisationId,
        ...addIdsForLog(handshakeContext, addressType),
        discardedRoles
      },
      'Posted roles the address page does not offer were not saved'
    )
  }
}

const rerenderIfRolesInvalid = ({ addMode, keptRoles, rerender }) => {
  if (addMode !== ADD_MODES.ADDRESS_BOOK) {
    return undefined
  }
  const errors = rolesErrorsOf(keptRoles)
  return errors ? rerender({ errors }).code(HTTP_STATUS_BAD_REQUEST) : undefined
}

const rolesToSave = ({
  addMode,
  handshakeContext,
  addressType,
  postedRoles
}) =>
  addMode === ADD_MODES.ADDRESS_BOOK
    ? keepRolesOfferedBy(addressType, postedRoles)
    : rolesOfParty(handshakeContext, postedRoles)

const finishAddressBookAdd = (
  request,
  toolkit,
  { organisationId, createdAddress, addressType }
) => {
  logger.info(
    { organisationId, addressId: createdAddress.id, addressType },
    'Address added from the address book'
  )
  clearAddInProgress(request)
  setSuccessMessage(request, copy.successBanner.added(createdAddress.name))
  return toolkit.redirect(addressBookPageHref(1, { addressType }))
}

const rerenderAfterCreateFailure = (err, { organisationId, rerender }) => {
  if (Boom.isBoom(err)) {
    throw err
  }
  if (isValidationFailure(err)) {
    logger.warn({ err, organisationId }, 'Address book refused the new address')
    return rerender({ errors: mapApiErrorsToFormErrors(err.body) }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  logger.error({ err, organisationId }, 'Failed to create address')
  return rerender({ recoverableError: true }).code(
    HTTP_STATUS_INTERNAL_SERVER_ERROR
  )
}

const createAddressAndRespond = async (
  request,
  toolkit,
  {
    handshakeContext,
    organisationId,
    addressType,
    landing,
    addMode,
    addressToCreate,
    postedCountryCode,
    storedCountryCode
  }
) => {
  const createdAddress = await createAddress(organisationId, addressToCreate)
  logReplacedCountry({
    handshakeContext,
    organisationId,
    addressId: createdAddress.id,
    addressType,
    postedCountryCode,
    storedCountryCode
  })
  return addMode === ADD_MODES.ADDRESS_BOOK
    ? finishAddressBookAdd(request, toolkit, {
        organisationId,
        createdAddress,
        addressType
      })
    : handBackAddress(toolkit, handshakeContext, {
        organisationId,
        addressId: createdAddress.id,
        landing
      })
}

const submitAddress = async (
  request,
  toolkit,
  {
    addMode,
    handshakeContext,
    organisationId,
    postedValues,
    postedRoles,
    addressType,
    landing
  }
) => {
  const { countryItems, countryCodes, formValues } = await addFormCountryOffer({
    handshakeContext,
    addressType,
    placeholder: copy.form.countryPlaceholder,
    formValues: postedValues
  })
  const rerender = (model) =>
    buildView(toolkit, {
      addMode,
      formValues,
      countryItems,
      handshakeContext,
      addressType,
      tickedRoles: postedRoles,
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
    const savedRoles = rolesToSave({
      addMode,
      handshakeContext,
      addressType,
      postedRoles
    })
    logDiscardedRoles({
      handshakeContext,
      organisationId,
      addressType,
      postedRoles,
      keptRoles: savedRoles
    })
    const rolesRefusal = rerenderIfRolesInvalid({
      addMode,
      keptRoles: savedRoles,
      rerender
    })
    if (rolesRefusal) {
      return rolesRefusal
    }
    return await createAddressAndRespond(request, toolkit, {
      handshakeContext,
      organisationId,
      addressType,
      landing,
      addMode,
      addressToCreate: { ...validatedAddress, roles: savedRoles },
      postedCountryCode: postedValues.countryCode,
      storedCountryCode: formValues.countryCode
    })
  } catch (err) {
    return rerenderAfterCreateFailure(err, { organisationId, rerender })
  }
}

const post = async (request, toolkit) => {
  const handshakeContext = resolveHandshakeContext(request)
  const addMode = addModeFor(handshakeContext)
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return redirectAfterCancel(toolkit, { addMode, handshakeContext })
  }
  const redirectToTypePage = redirectIfNoAddressTypeChosen(
    request,
    toolkit,
    addMode
  )
  if (redirectToTypePage) {
    return redirectToTypePage
  }
  const organisationId = kit.requireOrganisationId(request)
  const postedValues = formValuesOf(payload)
  const postedRoles = postedRolesOf(payload)
  const addressType = addressBookAddressTypeOf(request, addMode)
  storeAddressBookEntry(request, {
    addMode,
    addressType,
    postedValues,
    postedRoles
  })

  return submitAddress(request, toolkit, {
    addMode,
    handshakeContext,
    organisationId,
    postedValues,
    postedRoles,
    addressType,
    landing: landingChosenBy(payload)
  })
}

export const routes = kit.pageRoutes(addressAddPath(), { get, post })
