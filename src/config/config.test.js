import { config } from './config.js'

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
})
