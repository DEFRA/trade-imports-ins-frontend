import Crumb from '@hapi/crumb'

import { config } from '#/config/config.js'

/**
 * CSRF protection via @hapi/crumb. Disabled during test runs (see config csrf.enabled).
 */
export const csrf = {
  plugin: Crumb,
  options: {
    cookieOptions: {
      isSecure: config.get('csrf.cookie.secure'),
      isHttpOnly: true,
      isSameSite: 'Strict'
    },
    skip: (request) => {
      if (!config.get('csrf.enabled')) {
        return true
      }

      return (
        request.path.startsWith('/health') ||
        request.path.startsWith('/assets') ||
        request.path.startsWith('/public')
      )
    }
  }
}
