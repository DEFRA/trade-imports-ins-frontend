import { addController } from './controller.js'
import { addressBookAdd } from '#/server/common/constants/routes.js'
import { sessionAuthRouteOptions } from '#/server/common/constants/session-auth-route-options.js'

export const addressBookAdd = {
  plugin: {
    name: 'address-book-add',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: addressBookAdd(),
          handler: addController.get.handler,
          options: sessionAuthRouteOptions
        },
        {
          method: 'POST',
          path: addressBookAdd(),
          handler: addController.post.handler,
          options: sessionAuthRouteOptions
        }
      ])
    }
  }
}
