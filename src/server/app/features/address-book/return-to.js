import {
  SET_BASES,
  SET_FRONTEND_BASE_URL_KEYS
} from '../../../common/constants/journey-set-bases.js'
import { isStubMode } from '../../../common/services/mode.js'
import { buildSetBaseUrl } from '../../../common/helpers/set-base-url.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import { addressBookPath, addressPath } from '../../shared/paths.js'

const logger = createLogger()

const RETURN_QUERY_KEY = 'return'

const normalisedRelativePath = (pathOrUrl) => {
  if (!pathOrUrl.startsWith('/') || pathOrUrl.startsWith('//')) {
    return null
  }
  const standInOrigin = 'https://relative-path.invalid'
  try {
    const url = new URL(pathOrUrl, standInOrigin)
    const staysOnStandInOrigin = url.origin === standInOrigin
    return staysOnStandInOrigin
      ? `${url.pathname}${url.search}${url.hash}`
      : null
  } catch {
    return null
  }
}

const pathnameOf = (pathOrUrl) =>
  pathOrUrl.startsWith('/') ? pathOrUrl.split(/[?#]/)[0] : null

const liveAnimalsBaseUrl = () =>
  buildSetBaseUrl(
    SET_FRONTEND_BASE_URL_KEYS[SET_BASES.LIVE_ANIMALS],
    SET_BASES.LIVE_ANIMALS
  )

const isLiveAnimalsPath = (path) => {
  const pathname = pathnameOf(path)
  return (
    pathname === SET_BASES.LIVE_ANIMALS ||
    pathname.startsWith(`${SET_BASES.LIVE_ANIMALS}/`)
  )
}

const liveAnimalsUrlOf = (liveAnimalsPath) =>
  `${liveAnimalsBaseUrl()}${liveAnimalsPath.slice(SET_BASES.LIVE_ANIMALS.length)}`

const animalsFrontendHrefOf = (pathOrUrl) => {
  try {
    const url = new URL(pathOrUrl)
    return url.origin === new URL(liveAnimalsBaseUrl()).origin ? url.href : null
  } catch {
    return null
  }
}

const refuseReturn = (request, requestedReturn, reason) => {
  logger.info(
    { path: request.path, requestedReturn, reason },
    'Return query refused, ignoring it'
  )
  return null
}

const animalsFrontendReturn = (request, animalsFrontendHref) =>
  isStubMode()
    ? refuseReturn(
        request,
        animalsFrontendHref,
        'animals frontend return refused in stub mode'
      )
    : animalsFrontendHref

const honouredPathOrUrl = (request, requestedReturn) => {
  const path = normalisedRelativePath(requestedReturn)
  if (path && !isLiveAnimalsPath(path)) {
    return path
  }
  const animalsFrontendHref = path
    ? liveAnimalsUrlOf(path)
    : animalsFrontendHrefOf(requestedReturn)
  if (!animalsFrontendHref) {
    return refuseReturn(
      request,
      requestedReturn,
      'not an INS path, a live-animals path or an animals frontend URL'
    )
  }
  return animalsFrontendReturn(request, animalsFrontendHref)
}

export const honouredReturnOf = (request) => {
  const requestedReturn = request.query?.[RETURN_QUERY_KEY]
  if (!requestedReturn) {
    return null
  }
  if (typeof requestedReturn !== 'string') {
    return refuseReturn(request, requestedReturn, 'not a single value')
  }
  const unsafeRedirectCharacters = /[\\\r\n]/
  if (unsafeRedirectCharacters.test(requestedReturn)) {
    return refuseReturn(request, requestedReturn, 'unsafe characters')
  }
  return honouredPathOrUrl(request, requestedReturn)
}

export const pathWithReturn = (path, honouredReturn) =>
  !honouredReturn || honouredReturn === addressBookPath()
    ? path
    : `${path}?${new URLSearchParams({ [RETURN_QUERY_KEY]: honouredReturn })}`

const isOwnPageOf = (ownPagePath, pathOrUrl) => {
  const pathname = pathnameOf(pathOrUrl)
  return (
    pathname === ownPagePath || pathname?.startsWith(`${ownPagePath}/`) === true
  )
}

/** Where a record's own pages send the user when they leave: the return they
 * carry, unless it points back at the record being left, else `fallback`. */
export const destinationAwayFrom = (ownPagePath, honouredReturn, fallback) =>
  honouredReturn && !isOwnPageOf(ownPagePath, honouredReturn)
    ? honouredReturn
    : fallback

export const returnDestinationOf = (addressId, honouredReturn) =>
  destinationAwayFrom(addressPath(addressId), honouredReturn, addressBookPath())

export const editLeaveDestinationOf = (addressId, honouredReturn) =>
  honouredReturn ?? addressPath(addressId)

export const deadLinkDestination = (request) =>
  returnDestinationOf(request.params?.id ?? '', honouredReturnOf(request))

export const landsOnAddressBook = (destination) =>
  pathnameOf(destination) === addressBookPath()
