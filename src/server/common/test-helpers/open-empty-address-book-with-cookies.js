import { statusCodes } from '../constants/status-codes.js'
import {
  addressBookPath,
  addressesApiPath,
  cookieHeaderOf,
  pageOf
} from './address-book-requests.js'
import { addressBookApi } from './real-mode.js'
import { sessionAuth } from './session-auth.js'

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
    url: addressBookPath(),
    auth: sessionAuth(sessionId),
    headers: { cookie: cookieHeaderOf(postHeaders) }
  })
}
