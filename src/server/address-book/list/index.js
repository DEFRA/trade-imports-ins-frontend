import { listController } from './controller.js'
import { addressBookList } from '#/server/common/constants/routes.js'
import { sessionAuthRouteOptions } from '#/server/common/constants/session-auth-route-options.js'

export const addressBookList = {
  plugin: {
    name: 'address-book-list',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: addressBookList(),
          handler: listController.handler,
          options: sessionAuthRouteOptions
        }
      ])
    }
  }
}
