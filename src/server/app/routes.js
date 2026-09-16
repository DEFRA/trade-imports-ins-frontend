import { allRoutes } from './features/index.js'

export const serviceRoutes = {
  plugin: {
    name: 'import-notification-service',
    register: (server) => {
      server.route(allRoutes)
    }
  }
}
