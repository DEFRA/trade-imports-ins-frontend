import { notificationTypePath } from '../../shared/paths.js'
import { sessionAuth } from '../../../common/test-helpers/session-auth.js'

export const CRN = '1100598138'

export const requestsTo = (getServer) => ({
  getPage: (user, query) =>
    getServer().inject({
      method: 'GET',
      url: query
        ? `${notificationTypePath()}?${query}`
        : notificationTypePath(),
      auth: sessionAuth(user, { crn: CRN })
    }),
  postType: (user, payload) =>
    getServer().inject({
      method: 'POST',
      url: notificationTypePath(),
      auth: sessionAuth(user, { crn: CRN }),
      payload
    })
})
