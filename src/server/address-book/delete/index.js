import { deleteController } from './controller.js'
import { addressBookDeletePath } from '#/server/common/constants/routes.js'
import { addressIdRouteOptions } from '../address-id-params.js'

export const addressBookDelete = {
  plugin: {
    name: 'address-book-delete',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: addressBookDeletePath(),
          handler: deleteController.get.handler,
          options: addressIdRouteOptions
        },
        {
          method: 'POST',
          path: addressBookDeletePath(),
          handler: deleteController.post.handler,
          options: addressIdRouteOptions
        }
      ])
    }
  }
}
