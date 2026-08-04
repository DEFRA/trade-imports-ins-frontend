import { signoutController } from './controller.js'
import { sessionAuthRouteOptions } from '#/server/common/constants/session-auth-route-options.js'

/**
 * Sets up the routes used in the /signout page.
 * These routes are registered in src/server/plugins/router.js.
 */
export const signout = {
  plugin: {
    name: 'signout',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/signout',
          handler: signoutController.handler,
          options: sessionAuthRouteOptions
        }
      ])
    }
  }
}
