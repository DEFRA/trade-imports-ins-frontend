import { viewController } from './controller.js'
import { addressIdRouteOptions } from '../address-id-params.js'

export const addressBookView = {
  plugin: {
    name: 'address-book-view',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-book/{id}',
          handler: viewController.handler,
          options: addressIdRouteOptions
        }
      ])
    }
  }
}
