import { config } from '../../../config/config.js'

// Never honoured in production, whatever the environment says: stub mode hands a session to any unauthenticated caller, so obeying the flag there would let anyone able to set an env var sign in as the stub user.
export const isStubMode = () =>
  config.get('stubMode') && !config.get('isProduction')
