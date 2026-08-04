import { editController } from './controller.js'
import { addressIdRouteOptions } from '../address-id-params.js'

export const addressBookEdit = {
  plugin: {
    name: 'address-book-edit',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-book/{id}/edit',
          handler: editController.get.handler,
          options: addressIdRouteOptions
        },
        {
          method: 'POST',
          path: '/address-book/{id}/edit',
          handler: editController.post.handler,
          options: addressIdRouteOptions
        }
      ])
    }
  }
}
