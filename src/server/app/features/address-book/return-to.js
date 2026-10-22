import { config } from '../../../../config/config.js'
import { isStubMode } from '../../../common/services/mode.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import { addressBookPath, addressPath } from '../../shared/paths.js'

const logger = createLogger()

const RETURN_QUERY_KEY = 'return'

const normalisedInsPathOrNull = (pathOrUrl) => {
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

const pathnameOrNull = (pathOrUrl) =>
  pathOrUrl.startsWith('/') ? pathOrUrl.split(/[?#]/)[0] : null

const animalsOrigin = () =>
  new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin

const animalsUrlOrNull = (pathOrUrl) => {
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

export const honouredReturnOrNull = (request) => {
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
    normalisedInsPathOrNull(requestedReturn) ??
    animalsUrlOrNull(requestedReturn)
  if (!honouredReturn) {
    logRefusedReturn(request, 'not an INS path or an animals frontend URL')
  }
  return honouredReturn
}

export const pathWithReturn = (path, honouredReturn) =>
  !honouredReturn || honouredReturn === addressBookPath()
    ? path
    : `${path}?${new URLSearchParams({ [RETURN_QUERY_KEY]: honouredReturn })}`

const isOwnPageOf = (addressId, pathOrUrl) => {
  const pathname = pathnameOrNull(pathOrUrl)
  const addressPagePath = addressPath(addressId)
  return (
    pathname === addressPagePath ||
    pathname?.startsWith(`${addressPagePath}/`) === true
  )
}

export const honouredReturnOrAddressBook = (addressId, honouredReturn) =>
  honouredReturn && !isOwnPageOf(addressId, honouredReturn)
    ? honouredReturn
    : addressBookPath()

export const deadLinkDestination = (request) =>
  honouredReturnOrAddressBook(
    request.params?.id ?? '',
    honouredReturnOrNull(request)
  )

export const landsOnAddressBook = (destination) =>
  pathnameOrNull(destination) === addressBookPath()
