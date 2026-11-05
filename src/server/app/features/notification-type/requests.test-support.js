import { sessionAuth } from '../../../common/test-helpers/session-auth.js'

const NOTIFICATION_TYPE_URL = '/notification-type'

export const CRN = '1100598138'

export const requestsTo = (server) => ({
  getPage: (user, query) =>
    server().inject({
      method: 'GET',
      url: query ? `${NOTIFICATION_TYPE_URL}?${query}` : NOTIFICATION_TYPE_URL,
      auth: sessionAuth(user, { crn: CRN })
    }),
  postType: (user, payload) =>
    server().inject({
      method: 'POST',
      url: NOTIFICATION_TYPE_URL,
      auth: sessionAuth(user, { crn: CRN }),
      payload
    })
})
