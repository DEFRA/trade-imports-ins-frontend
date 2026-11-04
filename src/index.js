import process from 'node:process'

import { allowOneSecondPerAddressWhenConnecting } from './server/common/helpers/connect-attempt.js'
import { startServer } from './server/common/helpers/start-server.js'
import { createLogger } from './server/common/helpers/logging/logger.js'

const logger = createLogger()

process.on('unhandledRejection', (error) => {
  logger.error({ err: error }, 'Unhandled rejection')
  process.exitCode = 1
})

allowOneSecondPerAddressWhenConnecting()

try {
  await startServer()
} catch (error) {
  logger.error({ err: error }, 'Server failed to start')
  process.exit(1)
}
