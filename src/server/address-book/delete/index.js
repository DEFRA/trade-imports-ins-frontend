import { deleteController } from './controller.js'

export const addressBookDelete = {
  plugin: {
    name: 'address-book-delete',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-book/{id}/delete',
          ...deleteController.get
        },
        {
          method: 'POST',
          path: '/address-book/{id}/delete',
          ...deleteController.post
        }
      ])
    }
  }
}
