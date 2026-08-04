import { deleteController } from './controller.js'
import { addressIdRouteOptions } from '../address-id-params.js'

export const addressBookDelete = {
  plugin: {
    name: 'address-book-delete',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-book/{id}/delete',
          ...deleteController.get,
          options: addressIdRouteOptions
        },
        {
          method: 'POST',
          path: '/address-book/{id}/delete',
          ...deleteController.post,
          options: addressIdRouteOptions
        }
      ])
    }
  }
}
