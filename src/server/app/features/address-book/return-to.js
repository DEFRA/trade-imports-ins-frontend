import { config } from '../../../../config/config.js'
import { isStubMode } from '../../../common/services/mode.js'
import { addressBookPath, addressPath } from '../../shared/paths.js'

export const RETURN_QUERY_KEY = 'return'

// Characters browsers or the URL parser rewrite into an off-site redirect, or that split a Location header.
const UNSAFE_REDIRECT_CHARACTERS = /[\\\r\n]/

// Normalised so the path is percent-encoded and safe in a Location header.
const normalisedInsPathOrNull = (pathOrUrl) => {
  if (!pathOrUrl.startsWith('/') || pathOrUrl.startsWith('//')) {
    return null
  }
  const standInOrigin = 'https://relative-path.invalid'
  try {
    // If standInOrigin is retained in the resulting URL, then pathOrUrl was a relative INS
    // path, which is normalised and returned.
    const url = new URL(pathOrUrl, standInOrigin)
    return url.origin === standInOrigin
      ? `${url.pathname}${url.search}${url.hash}`
      : null
  } catch {
    return null
  }
}

// An honoured return or a path this service built, so not validated here: an INS path
// gives its pathname, an animals frontend URL gives null.
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

/** A page of this service, or outside stub mode a URL on exactly the animals frontend origin. */
export const honouredReturnOrNull = (request) => {
  const value = request.query?.[RETURN_QUERY_KEY]
  if (
    typeof value !== 'string' ||
    !value ||
    UNSAFE_REDIRECT_CHARACTERS.test(value)
  ) {
    return null
  }
  return normalisedInsPathOrNull(value) ?? animalsUrlOrNull(value)
}

/** The address book list is never carried: it is where a missing return already goes. */
export const pathWithReturn = (path, honouredReturn) =>
  !honouredReturn || honouredReturn === addressBookPath()
    ? path
    : `${path}?${new URLSearchParams({ [RETURN_QUERY_KEY]: honouredReturn })}`

/** Its own pages are its view page and any page under it, such as edit and delete. */
export const isOwnPageOf = (addressId, pathOrUrl) => {
  const pathname = pathnameOrNull(pathOrUrl)
  const own = addressPath(addressId)
  return pathname === own || pathname?.startsWith(`${own}/`) === true
}

/** A return to one of this address's own pages is passed over for the address book. */
export const honouredReturnOrAddressBook = (addressId, honouredReturn) =>
  honouredReturn && !isOwnPageOf(addressId, honouredReturn)
    ? honouredReturn
    : addressBookPath()

export const deadLinkDestination = (request) =>
  honouredReturnOrAddressBook(
    request.params?.id ?? '',
    honouredReturnOrNull(request)
  )

/** The deleted banner shows only when the delete lands on the list. */
export const landsOnAddressBook = (destination) =>
  pathnameOrNull(destination) === addressBookPath()
