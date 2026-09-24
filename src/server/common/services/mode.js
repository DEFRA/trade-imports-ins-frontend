import { config } from '#/config/config.js'

export const mode = () => config.get('runMode')

export const isRealMode = () => mode() === 'real'

export const isStubMode = () => mode() === 'stub'

export const isAuthStubMode = () =>
  config.get('auth.stubMode') && !config.get('isProduction')

/** EUDPA-390: the address lookup spike page exists only for dev/local (plan D3) — no flag of our own. */
export const isDevOrLocalEnvironment = () =>
  ['dev', 'local'].includes(config.get('cdpEnvironment'))
