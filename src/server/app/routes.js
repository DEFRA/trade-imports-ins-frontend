import { allRoutes } from './features/index.js'
import * as addressLookupSpike from './features/address-lookup-spike/controller.js'
import { isDevOrLocalEnvironment } from './features/address-lookup-spike/is-dev-or-local.js'

export const serviceRoutes = {
  plugin: {
    name: 'import-notification-service',
    register: (server) => {
      // EUDPA-390: temporary spike page, dev/local only — no flag of our own.
      server.route(
        isDevOrLocalEnvironment()
          ? [...allRoutes, ...addressLookupSpike.routes]
          : allRoutes
      )
    }
  }
}
