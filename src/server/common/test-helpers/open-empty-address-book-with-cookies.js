import { statusCodes } from '../constants/status-codes.js'
import {
  ADDRESS_BOOK_PATH,
  addressesApiPath,
  pageOf
} from './address-book-requests.js'
import { addressBookApi } from './real-mode.js'
import { sessionAuth } from './session-auth.js'

const cookieHeaderOf = (headers) =>
  [headers['set-cookie']]
    .flat()
    .filter(Boolean)
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

export const openEmptyAddressBookWithCookiesFrom = (
  server,
  sessionId,
  postHeaders
) => {
  const { organisationId } = sessionAuth(sessionId).credentials
  addressBookApi()
    .get(addressesApiPath(organisationId))
    .query(true)
    .reply(statusCodes.ok, pageOf([]))
  return server.inject({
    method: 'GET',
    url: ADDRESS_BOOK_PATH,
    auth: sessionAuth(sessionId),
    headers: { cookie: cookieHeaderOf(postHeaders) }
  })
}
