import { editController } from './controller.js'
import { addressBookEditPath } from '#/server/common/constants/routes.js'
import { addressIdRouteOptions } from '../address-id-params.js'

export const addressBookEdit = {
  plugin: {
    name: 'address-book-edit',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: addressBookEditPath(),
          handler: editController.get.handler,
          options: addressIdRouteOptions
        },
        {
          method: 'POST',
          path: addressBookEditPath(),
          handler: editController.post.handler,
          options: addressIdRouteOptions
        }
      ])
    }
  }
}
