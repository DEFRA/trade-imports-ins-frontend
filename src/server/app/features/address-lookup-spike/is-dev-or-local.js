import { config } from '../../../../config/config.js'

export const isDevOrLocalEnvironment = () =>
  ['dev', 'local'].includes(config.get('cdpEnvironment'))
