import { config } from '../../../../config/config.js'
import {
  SET_BASES,
  SET_FRONTEND_BASE_URL_KEYS
} from '../../../common/constants/journey-set-bases.js'
import { isStubMode } from '../../../common/services/mode.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import { addressBookPath, addressPath } from '../../shared/paths.js'

const logger = createLogger()

const RETURN_QUERY_KEY = 'return'

const normalisedInsPath = (pathOrUrl) => {
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

const animalsOrigin = () =>
  new URL(config.get(SET_FRONTEND_BASE_URL_KEYS[SET_BASES.LIVE_ANIMALS])).origin

const animalsUrl = (pathOrUrl) => {
  if (isStubMode()) {
    return null
  }
  try {
    const url = new URL(pathOrUrl)
    return url.origin === animalsOrigin() ? url.href : null
  } catch {
    return null
  }
}

const logRefusedReturn = (request, reason) => {
  logger.info(
    { path: request.path, reason },
    'Return query refused, ignoring it'
  )
}

export const honouredReturnOf = (request) => {
  const requestedReturn = request.query?.[RETURN_QUERY_KEY]
  if (!requestedReturn) {
    return null
  }
  if (typeof requestedReturn !== 'string') {
    logRefusedReturn(request, 'not a single value')
    return null
  }
  const unsafeRedirectCharacters = /[\\\r\n]/
  if (unsafeRedirectCharacters.test(requestedReturn)) {
    logRefusedReturn(request, 'unsafe characters')
    return null
  }
  const honouredReturn =
    normalisedInsPath(requestedReturn) ?? animalsUrl(requestedReturn)
  if (!honouredReturn) {
    logRefusedReturn(request, 'not an INS path or an animals frontend URL')
  }
  return honouredReturn
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
