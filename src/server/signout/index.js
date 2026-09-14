import { signoutController } from './controller.js'
import { routeOptions } from '../app/shared/kit.js'

export const signout = {
  plugin: {
    name: 'signout',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/signout',
          handler: signoutController.handler,
          options: routeOptions
        }
      ])
    }
  }
}
