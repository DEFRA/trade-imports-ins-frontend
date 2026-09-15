import { vi } from 'vitest'

const mockReadFileSync = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('node:fs', async () => {
  const nodeFs = await import('node:fs')

  return {
    ...nodeFs,
    readFileSync: () => mockReadFileSync()
  }
})
vi.mock('../../../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))
vi.mock(import('../../config.js'), async (importOriginal) => {
  const originalModule = await importOriginal()
  return {
    config: {
      get(key) {
        if (key === 'isProduction') return true
        return originalModule.config.get(key)
      }
    }
  }
})

const expectedContext = {
  assetPath: '/public/assets',
  getAssetPath: expect.any(Function),
  serviceName: 'trade-imports-ins-frontend',
  serviceUrl: '/',
  authEnabled: true,
  activeNavigationItem: 'dashboard',
  dashboardUrl: '/',
  addressBookUrl: '/address-book',
  userSession: {
    isAuthenticated: false
  },
  crumb: ''
}

describe('context and cache', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
    vi.resetModules()
  })

  describe('#context', () => {
    const mockRequest = { path: '/' }

    describe('When webpack manifest file read succeeds', () => {
      let contextImport
      let contextResult

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = contextImport.context(mockRequest)
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual(expectedContext)
      })

      test('Should expose authenticated user details in userSession', () => {
        const authenticatedRequest = {
          path: '/address-book',
          auth: {
            isAuthenticated: true,
            credentials: {
              name: 'Andrew Farmer',
              email: 'a.farmer@farms.com'
            }
          }
        }

        const authenticatedContext = contextImport.context(authenticatedRequest)

        expect(authenticatedContext.userSession).toEqual({
          isAuthenticated: true,
          displayName: 'Andrew Farmer',
          email: 'a.farmer@farms.com'
        })
      })

      describe('With valid asset path', () => {
        test('Should provide expected asset path', () => {
          expect(contextResult.getAssetPath('application.js')).toBe(
            '/public/javascripts/application.js'
          )
        })
      })

      describe('With invalid asset path', () => {
        test('Should provide expected asset', () => {
          expect(contextResult.getAssetPath('an-image.png')).toBe(
            '/public/an-image.png'
          )
        })
      })
    })

    describe('When webpack manifest file read fails', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        mockReadFileSync.mockReturnValue(new Error('File not found'))

        contextImport.context(mockRequest)
      })

      test('Should log that the Webpack Manifest file is not available', () => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Webpack assets-manifest.json not found'
        )
      })
    })
  })

  describe('#context cache', () => {
    const mockRequest = { path: '/' }
    let contextResult

    describe('Webpack manifest file cache', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = contextImport.context(mockRequest)
      })

      test('Should read file', () => {
        expect(mockReadFileSync).toHaveBeenCalled()
      })

      test('Should use cache', () => {
        expect(mockReadFileSync).not.toHaveBeenCalled()
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual(expectedContext)
      })
    })
  })

  describe('#activeNavigationItem', () => {
    let activeNavigationItem

    beforeAll(async () => {
      ;({ activeNavigationItem } = await import('./context.js'))
    })

    test('Should mark the dashboard on the dashboard', () => {
      expect(activeNavigationItem('/')).toBe('dashboard')
    })

    test('Should mark the address book on the address book', () => {
      expect(activeNavigationItem('/address-book')).toBe('addressBook')
    })

    test('Should keep the address book marked inside an address', () => {
      expect(activeNavigationItem('/address-book/abc-123/edit')).toBe(
        'addressBook'
      )
    })

    test('Should mark nothing on a path that merely starts with the section name', () => {
      expect(activeNavigationItem('/address-bookkeeping')).toBeNull()
    })

    test('Should mark nothing on a page outside the navigation', () => {
      expect(activeNavigationItem('/auth/sign-out')).toBeNull()
    })

    test('Should mark nothing when there is no path', () => {
      expect(activeNavigationItem(undefined)).toBeNull()
    })
  })
})
