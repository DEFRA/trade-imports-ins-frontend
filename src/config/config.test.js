import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { config } from './config.js'

const originalStubMode = process.env.STUB_MODE

const restoreStubMode = () => {
  if (originalStubMode === undefined) {
    delete process.env.STUB_MODE
  } else {
    process.env.STUB_MODE = originalStubMode
  }
}

describe('#config', () => {
  test('defaults port to 3002', () => {
    expect(config.get('port')).toBe(3002)
  })

  test('loads TRADE_IMPORTS_ADDRESS_BOOK_URL with 8089 default', () => {
    expect(config.get('tradeImportsAddressBookApi.baseUrl')).toBe(
      'http://localhost:8089'
    )
  })

  test('loads reference data API URL', () => {
    expect(config.get('tradeImportsReferenceDataApi.baseUrl')).toBe(
      'http://localhost:8086'
    )
  })

  test('Defra ID redirect URLs use port 3002', () => {
    expect(config.get('defraId.redirectUrl')).toBe(
      'http://localhost:3002/auth/sign-in-oidc'
    )
    expect(config.get('defraId.signOutRedirectUrl')).toBe(
      'http://localhost:3002/auth/sign-out-oidc'
    )
  })

  describe('stubMode', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      restoreStubMode()
    })

    test('reads STUB_MODE=true as true', async () => {
      process.env.STUB_MODE = 'true'

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('stubMode')).toBe(true)
    })

    test('defaults to false when STUB_MODE is unset', async () => {
      delete process.env.STUB_MODE

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('stubMode')).toBe(false)
    })

    test("rejects a STUB_MODE value that is not 'true' or 'false'", async () => {
      process.env.STUB_MODE = 'flase'

      await expect(import('./config.js')).rejects.toThrow(
        "must be 'true' or 'false'"
      )
    })
  })
})
