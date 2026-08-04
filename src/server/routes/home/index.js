import { homeController } from './controller.js'
import { sessionAuthRouteOptions } from '#/server/common/constants/session-auth-route-options.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */
export const home = {
  plugin: {
    name: 'home',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/',
          handler: homeController.handler,
          options: sessionAuthRouteOptions
        }
      ])
    }
  }
}
