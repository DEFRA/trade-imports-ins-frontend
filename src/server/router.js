import inert from '@hapi/inert'

import { health } from './health/index.js'
import { importNotificationService } from './app/routes.js'
import { signout } from './signout/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      await server.register([health])

      if (config.get('auth.enabled')) {
        await server.register([importNotificationService, signout])
      }

      await server.register([serveStaticFiles])
    }
  }
}
