import { afterEach, describe, expect, test } from 'vitest'

import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'
import { config } from './config.js'

describe('config URL validation', () => {
  const originalAddressBookUrl = config.get(
    'tradeImportsAddressBookApi.baseUrl'
  )
  const originalAnimalsFrontendUrl = config.get(
    'tradeImportsAnimalsFrontend.baseUrl'
  )

  afterEach(() => {
    config.set('tradeImportsAddressBookApi.baseUrl', originalAddressBookUrl)
    config.set(
      'tradeImportsAnimalsFrontend.baseUrl',
      originalAnimalsFrontendUrl
    )
  })

  test('rejects a malformed tradeImportsAddressBookApi.baseUrl', () => {
    config.set('tradeImportsAddressBookApi.baseUrl', 'not a valid url')

    expect(() => config.validate({ allowed: 'strict' })).toThrow()
  })

  test('rejects a malformed tradeImportsAnimalsFrontend.baseUrl', () => {
    config.set('tradeImportsAnimalsFrontend.baseUrl', 'not a valid url')

    expect(() => config.validate({ allowed: 'strict' })).toThrow()
  })

  describe('the hidden IDM sign-in', () => {
    restoreConfigAfterEach(['idm.oidcDiscoveryUrl', 'idm.redirectUrl'])

    test.each(['idm.oidcDiscoveryUrl', 'idm.redirectUrl'])(
      'rejects a malformed %s',
      (key) => {
        config.set(key, 'not a valid url')

        expect(() => config.validate({ allowed: 'strict' })).toThrow(key)
      }
    )

    test('accepts no idm.oidcDiscoveryUrl', () => {
      config.set('idm.oidcDiscoveryUrl', null)

      expect(() => config.validate({ allowed: 'strict' })).not.toThrow()
    })
  })
})
