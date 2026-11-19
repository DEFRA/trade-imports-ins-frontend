import { beforeAll, beforeEach } from 'vitest'

import {
  hiddenIdmSignInProvider,
  providerSettingKey
} from '../../../auth/identity-providers.js'
import { config } from '../../../config/config.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

const IDM_ORIGIN = 'https://idm.example.test'

export const idmSettings = Object.freeze({
  oidcDiscoveryUrl: `${IDM_ORIGIN}/b2c/policy/.well-known/openid-configuration`,
  clientId: 'idm-client-id',
  serviceId: 'idm-service-id',
  clientSecret: 'idm-client-secret'
})

export const idmDiscoveryDocument = Object.freeze({
  issuer: `${IDM_ORIGIN}/issuer`,
  authorization_endpoint: `${IDM_ORIGIN}/authorize`,
  token_endpoint: `${IDM_ORIGIN}/token`,
  jwks_uri: `${IDM_ORIGIN}/keys`
})

export const idmSettingKeys = Object.keys(idmSettings).map((setting) =>
  providerSettingKey(hiddenIdmSignInProvider, setting)
)

export const applyIdmSettings = () => {
  for (const [setting, value] of Object.entries(idmSettings)) {
    config.set(providerSettingKey(hiddenIdmSignInProvider, setting), value)
  }
}

export const configureIdm = () => {
  restoreConfigAfterEach(idmSettingKeys)
  beforeAll(applyIdmSettings)
  beforeEach(applyIdmSettings)
}
