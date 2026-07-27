/**
 * Session helper functions for managing user session data
 * Using @hapi/yar for server-side session storage
 */

export function setSessionValue(request, key, value) {
  return request.yar.set(key, value)
}

export function getSessionValue(request, key, clear = false) {
  if (request.yar && typeof request.yar.get === 'function') {
    try {
      return request.yar.get(key, clear)
    } catch {
      return null
    }
  }
  return null
}

export function clearSessionValue(request, key) {
  request.yar.clear(key)
}
