import { config } from '#/config/config.js'

export const mode = () => config.get('runMode')

export const isRealMode = () => mode() === 'real'

export const isStubMode = () => mode() === 'stub'

export const isAuthStubMode = () =>
  config.get('auth.stubMode') && !config.get('isProduction')
