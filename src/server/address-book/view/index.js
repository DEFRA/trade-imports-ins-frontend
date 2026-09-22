import { viewController } from './controller.js'
import { addressBookViewPath } from '#/server/common/constants/routes.js'
import { addressIdRouteOptions } from '../address-id-params.js'

export const addressBookView = {
  plugin: {
    name: 'address-book-view',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: addressBookViewPath(),
          handler: viewController.handler,
          options: addressIdRouteOptions
        }
      ])
    }
  }
}
