import { addController } from './controller.js'

export const addressBookAdd = {
  plugin: {
    name: 'address-book-add',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-book/add',
          ...addController.get
        },
        {
          method: 'POST',
          path: '/address-book/add',
          ...addController.post
        }
      ])
    }
  }
}
