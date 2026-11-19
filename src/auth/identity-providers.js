import { config } from '../config/config.js'

const callsFor = (dependency) => ({
  openidConfiguration: { dependency, operation: 'openid-configuration' },
  jwks: { dependency, operation: 'jwks', interfaceId: 'SYN-12' },
  tokenExchange: {
    dependency,
    operation: 'token-exchange',
    interfaceId: 'SYN-11'
  }
})

export const serviceSignInProvider = Object.freeze({
  configKey: 'defraId',
  calls: Object.freeze({
    ...callsFor('defra-id'),
    tokenRefresh: {
      dependency: 'defra-id',
      operation: 'token-refresh',
      interfaceId: 'SYN-13'
    }
  }),
  verifiesAudienceAndIssuer: false
})

export const hiddenIdmSignInProvider = Object.freeze({
  configKey: 'idm',
  calls: Object.freeze(callsFor('idm')),
  verifiesAudienceAndIssuer: true
})

/**
 * Reads one of an identity provider's settings from its config group.
 *
 * @param {{ configKey: string }} provider - `serviceSignInProvider` or `hiddenIdmSignInProvider`
 * @param {string} setting - a key within the provider's config group, such as `clientId`
 * @returns {*} the configured value
 */
export const providerSetting = (provider, setting) =>
  config.get(`${provider.configKey}.${setting}`)
