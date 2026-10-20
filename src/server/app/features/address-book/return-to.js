import { config } from '../../../../config/config.js'
import { isStubMode } from '../../../common/services/mode.js'
import { addressBookPath, addressPath } from '../../shared/paths.js'

export const RETURN_QUERY_KEY = 'return'

const UNSAFE_CHARACTERS = /[\\\r\n]/

// Normalised so the path is percent-encoded and safe in a Location header.
const insPath = (value) => {
  if (!value.startsWith('/') || value.startsWith('//')) {
    return null
  }
  // URL only parses absolute URLs, so the path is resolved against a stand-in origin that
  // can never be a real host; if the result keeps that origin, the value was a path here.
  const base = 'https://relative-path.invalid'
  try {
    const url = new URL(value, base)
    return url.origin === base
      ? `${url.pathname}${url.search}${url.hash}`
      : null
  } catch {
    return null
  }
}

// An honoured return is an INS path or an absolute animals frontend URL, so only a path has
// one of this service's pathnames.
const pathOf = (destination) =>
  destination.startsWith('/') ? destination.split(/[?#]/)[0] : null

const animalsOrigin = () =>
  new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin

const animalsUrl = (value) => {
  if (isStubMode()) {
    return null
  }
  try {
    const url = new URL(value)
    return url.origin === animalsOrigin() ? url.href : null
  } catch {
    return null
  }
}

/**
 * Reads the `return` query: a page of this service, or outside stub mode a URL on
 * exactly the animals frontend origin. Anything else is ignored.
 *
 * @param {object} request - Hapi request
 * @returns {string | null} The honoured return, or null
 */
export const readReturn = (request) => {
  const value = request.query?.[RETURN_QUERY_KEY]
  if (typeof value !== 'string' || !value || UNSAFE_CHARACTERS.test(value)) {
    return null
  }
  return insPath(value) ?? animalsUrl(value)
}

/**
 * Carries an honoured return on to the next link. The list itself is not carried.
 *
 * @param {string} path - The link's path
 * @param {string | null} returnTo - The honoured return
 * @returns {string} The path, with the return when there is one to carry
 */
export const withReturn = (path, returnTo) =>
  !returnTo || returnTo === addressBookPath()
    ? path
    : `${path}?${new URLSearchParams({ [RETURN_QUERY_KEY]: returnTo })}`

/**
 * Whether the return is one of the address's own pages of this service.
 *
 * @param {string} id - The address id
 * @param {string} returnTo - The honoured return
 * @returns {boolean} True for the address's own pages
 */
export const isOwnPageOf = (id, returnTo) => {
  const path = pathOf(returnTo)
  const own = addressPath(id)
  return path === own || path?.startsWith(`${own}/`) === true
}

/**
 * Where to go once an address's own pages are no use: the return, or the list.
 *
 * @param {string} id - The address id
 * @param {string | null} returnTo - The honoured return
 * @returns {string} The return when it is not one of the address's own pages, else the list
 */
export const returnAwayFrom = (id, returnTo) =>
  returnTo && !isOwnPageOf(id, returnTo) ? returnTo : addressBookPath()

/**
 * Destination for a dead view or delete link.
 *
 * @param {object} request - Hapi request
 * @returns {string} The honoured return, or the list
 */
export const deadLinkDestination = (request) =>
  returnAwayFrom(request.params?.id ?? '', readReturn(request))

/**
 * Whether a destination is the address book list (so the deleted banner belongs there).
 *
 * @param {string} destination - A path or URL
 * @returns {boolean} True for the list on this service
 */
export const landsOnAddressBook = (destination) =>
  pathOf(destination) === addressBookPath()
