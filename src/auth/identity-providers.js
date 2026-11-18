import { config } from '../config/config.js'
import { DEFRA_ID_CALLS, IDM_CALLS } from './defra-id-calls.js'

export const defraIdProvider = Object.freeze({
  configKey: 'defraId',
  calls: DEFRA_ID_CALLS,
  verifiesAudienceAndIssuer: false
})

export const idmProvider = Object.freeze({
  configKey: 'idm',
  calls: IDM_CALLS,
  verifiesAudienceAndIssuer: true
})

/**
 * Reads one of an identity provider's settings from its config group.
 *
 * @param {{ configKey: string }} provider - `defraIdProvider` or `idmProvider`
 * @param {string} setting - a key within the provider's config group, such as `clientId`
 * @returns {*} the configured value
 */
export const providerSetting = (provider, setting) =>
  config.get(`${provider.configKey}.${setting}`)
