import { editController } from './controller.js'

export const addressBookEdit = {
  plugin: {
    name: 'address-book-edit',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-book/{id}/edit',
          ...editController.get
        },
        {
          method: 'POST',
          path: '/address-book/{id}/edit',
          ...editController.post
        }
      ])
    }
  }
}
