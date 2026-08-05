import { addController } from './controller.js'
import { sessionAuthRouteOptions } from '#/server/common/constants/session-auth-route-options.js'

export const addressBookAdd = {
  plugin: {
    name: 'address-book-add',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-book/add',
          handler: addController.get.handler,
          options: sessionAuthRouteOptions
        },
        {
          method: 'POST',
          path: '/address-book/add',
          handler: addController.post.handler,
          options: sessionAuthRouteOptions
        }
      ])
    }
  }
}
