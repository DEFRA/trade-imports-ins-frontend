import { afterEach, describe, expect, test } from 'vitest'

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
})
