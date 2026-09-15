import { allRoutes } from './features/index.js'

export const importNotificationService = {
  plugin: {
    name: 'import-notification-service',
    register: (server) => {
      server.route(allRoutes)
    }
  }
}
