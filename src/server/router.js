import inert from '@hapi/inert'

import { health } from './health/index.js'
import { importNotificationService } from './app/routes.js'
import { addressBookList } from './address-book/list/index.js'
import { addressBookAdd } from './address-book/add/index.js'
import { addressBookView } from './address-book/view/index.js'
import { addressBookEdit } from './address-book/edit/index.js'
import { addressBookDelete } from './address-book/delete/index.js'
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
        await server.register([
          importNotificationService,
          signout,
          addressBookList,
          addressBookAdd,
          addressBookView,
          addressBookEdit,
          addressBookDelete
        ])
      }

      await server.register([serveStaticFiles])
    }
  }
}
