import { addressLookupSpikeController } from './controller.js'
import { sessionAuthRouteOptions } from '#/server/common/constants/session-auth-route-options.js'

/**
 * EUDPA-390 — temporary, dev/local-only page. Registered in plugins/router.js only when
 * isDevOrLocalEnvironment() (plan D3); no header or task-list link (kept off the task list,
 * easy to remove).
 */
export const addressLookupSpike = {
  plugin: {
    name: 'address-lookup-spike',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-lookup-spike',
          handler: addressLookupSpikeController.get.handler,
          options: sessionAuthRouteOptions
        },
        {
          method: 'POST',
          path: '/address-lookup-spike',
          handler: addressLookupSpikeController.post.handler,
          options: sessionAuthRouteOptions
        }
      ])
    }
  }
}
