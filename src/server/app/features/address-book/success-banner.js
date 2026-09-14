const SESSION_KEY = 'addressBookSuccess'

export const setSuccessBanner = (request, message) =>
  request.yar.set(SESSION_KEY, message)

export const takeSuccessBanner = (request) => request.yar.get(SESSION_KEY, true)
