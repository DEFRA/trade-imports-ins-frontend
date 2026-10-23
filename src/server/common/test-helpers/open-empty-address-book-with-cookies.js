import { statusCodes } from '../constants/status-codes.js'
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
    .get(`/organisation/${organisationId}/addresses`)
    .query(true)
    .reply(statusCodes.ok, {
      items: [],
      page: 1,
      pageSize: 25,
      totalItems: 0,
      totalPages: 0
    })
  return server.inject({
    method: 'GET',
    url: '/address-book',
    auth: sessionAuth(sessionId),
    headers: { cookie: cookieHeaderOf(postHeaders) }
  })
}
