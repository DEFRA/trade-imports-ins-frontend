import inert from '@hapi/inert'

import { home } from '../routes/home/index.js'
import { about } from '../routes/about/index.js'
import { health } from '../routes/health/index.js'
import { addressBookList } from '../address-book/list/index.js'
import { addressBookAdd } from '../address-book/add/index.js'
import { addressBookView } from '../address-book/view/index.js'
import { addressBookEdit } from '../address-book/edit/index.js'
import { addressBookDelete } from '../address-book/delete/index.js'
import { serveStaticFiles } from './serve-static-files.js'
import { config } from '#/config/config.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      await server.register([health])
      await server.register([
        home,
        about,
        addressBookList,
        addressBookAdd,
        addressBookView,
        addressBookEdit,
        addressBookDelete
      ])

      if (!config.get('isProduction') && !config.get('isTest')) {
        await (async () => {
          const createViteServer = (await import('vite')).createServer
          const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom'
          })

          await server.register({
            plugin: (await import('@defra/hapi-connect')).default,
            options: {
              path: '/public',
              middleware: [vite.middlewares]
            }
          })
        })()
      } else {
        server.register(serveStaticFiles)
      }
    }
  }
}
