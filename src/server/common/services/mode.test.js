import { vi } from 'vitest'

// Covers the runMode (INS_MODE) switch that selects between the real and
// stub address-book/countries clients. isAuthStubMode is intentionally not
// covered here - the sign-in stub it gates is exercised end-to-end
// elsewhere.
//
// config.get() is mocked directly (rather than vi.stubEnv + re-import)
// because convict resolves runMode once at config.js's module-load time -
// mocking the module is how this repo already tests config-driven branches
// (see config/nunjucks/context/context.test.js).
const mockConfigGet = vi.fn()

vi.mock('#/config/config.js', () => ({
  config: { get: (...args) => mockConfigGet(...args) }
}))

const { isRealMode, isStubMode, mode } = await import('./mode.js')

describe('#mode', () => {
  beforeEach(() => {
    mockConfigGet.mockReset()
  })

  test('reads runMode from config', () => {
    mockConfigGet.mockReturnValue('real')

    expect(mode()).toBe('real')
    expect(mockConfigGet).toHaveBeenCalledWith('runMode')
  })

  describe('when runMode is real (the default)', () => {
    beforeEach(() => {
      mockConfigGet.mockReturnValue('real')
    })

    test('isRealMode is true', () => {
      expect(isRealMode()).toBe(true)
    })

    test('isStubMode is false', () => {
      expect(isStubMode()).toBe(false)
    })
  })

  describe('when runMode is stub', () => {
    beforeEach(() => {
      mockConfigGet.mockReturnValue('stub')
    })

    test('isStubMode is true', () => {
      expect(isStubMode()).toBe(true)
    })

    test('isRealMode is false', () => {
      expect(isRealMode()).toBe(false)
    })
  })
})
