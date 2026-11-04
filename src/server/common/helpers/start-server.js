import { createServer } from '../../server.js'
import { config } from '../../../config/config.js'

async function startServer() {
  const server = await createServer()
  try {
    await server.start()
  } catch (err) {
    await server.stop({ timeout: 0 })
    throw err
  }

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your frontend on http://localhost:${config.get('port')}`
  )

  return server
}

export { startServer }
