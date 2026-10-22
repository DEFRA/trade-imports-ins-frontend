const SESSION_KEY = 'addressBookSuccess'

export const setSuccessMessage = (request, message) =>
  request.yar.set(SESSION_KEY, message)

export const takeSuccessMessage = (request) =>
  request.yar.get(SESSION_KEY, true)
