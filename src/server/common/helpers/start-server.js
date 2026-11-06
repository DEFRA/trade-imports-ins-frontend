import { createServer } from '../../server.js'
import { config } from '../../../config/config.js'
import { useRetryingKeepAliveAgentForWreck } from '../../../auth/wreck-agent.js'
import { allowOneSecondPerAddressWhenConnecting } from './connect-attempt.js'
import { createLogger } from './logging/logger.js'

async function startServer() {
  allowOneSecondPerAddressWhenConnecting()
  if (!config.get('httpProxy')) {
    useRetryingKeepAliveAgentForWreck(createLogger())
  }

  const server = await createServer()
  await server.start()

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your frontend on http://localhost:${config.get('port')}`
  )

  return server
}

export { startServer }
