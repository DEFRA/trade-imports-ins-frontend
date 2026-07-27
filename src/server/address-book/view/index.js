import { viewController } from './controller.js'

export const addressBookView = {
  plugin: {
    name: 'address-book-view',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-book/{id}',
          handler: viewController.handler
        }
      ])
    }
  }
}
