const ADDRESS_TYPE_URL = '/address-book/add/address-type'

/**
 * Turns a response's Set-Cookie header into a Cookie request header.
 * @param {{ headers: Record<string, string | string[]> }} response
 * @returns {string}
 */
export const cookieOf = (response) =>
  [response.headers['set-cookie'] ?? []]
    .flat()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

/**
 * Chooses an address type for the session, as the type page does, and returns
 * the cookie that carries the add in progress.
 * @param {import('@hapi/hapi').Server} server
 * @param {import('@hapi/hapi').ServerInjectOptions['auth']} auth
 * @param {string} addressType
 * @returns {Promise<string>}
 */
export const startAddAs = async (server, auth, addressType) =>
  cookieOf(
    await server.inject({
      method: 'POST',
      url: ADDRESS_TYPE_URL,
      auth,
      payload: { addressType }
    })
  )
