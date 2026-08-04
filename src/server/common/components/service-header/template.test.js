import { renderComponent } from '#/test-helpers/component-helpers.js'

describe('Service Header Component', () => {
  test('renders Sign out link for authenticated users', () => {
    const $header = renderComponent('service-header', {
      userSession: {
        isAuthenticated: true,
        displayName: 'Test User'
      },
      authEnabled: true
    })

    expect($header('.app-service-header__link').text().trim()).toBe('Sign out')
    expect($header('.app-service-header__link').attr('href')).toBe('/signout')
    expect($header('.app-service-header__user-name').text().trim()).toBe(
      'Test User'
    )
  })

  test('renders Sign in link for unauthenticated users when auth is enabled', () => {
    const $header = renderComponent('service-header', {
      userSession: {
        isAuthenticated: false
      },
      authEnabled: true
    })

    expect($header('.app-service-header__link').text().trim()).toBe('Sign in')
    expect($header('.app-service-header__link').attr('href')).toBe(
      '/auth/sign-in-oidc'
    )
  })

  test('hides Sign in link when auth is disabled', () => {
    const $header = renderComponent('service-header', {
      userSession: {
        isAuthenticated: false
      },
      authEnabled: false
    })

    expect($header('.app-service-header__link')).toHaveLength(0)
  })
})
