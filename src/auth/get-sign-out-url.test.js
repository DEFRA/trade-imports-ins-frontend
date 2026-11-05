import { config } from '../config/config.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'
import {
  setStackDefraIdRewrite,
  STACK_DEFRA_ID_REWRITE_KEYS
} from '../server/common/test-helpers/stack-defra-id-rewrite.js'
import { getSignOutUrl } from './get-sign-out-url.js'

const SIGN_OUT_REDIRECT_URL = 'http://localhost:3000/auth/sign-out-oidc'
const REDIRECT_QUERY = `?post_logout_redirect_uri=${encodeURIComponent(SIGN_OUT_REDIRECT_URL)}`

function configureSignOut(discoveryUrl) {
  config.set('defraId.oidcDiscoveryUrl', discoveryUrl)
  config.set('defraId.signOutRedirectUrl', SIGN_OUT_REDIRECT_URL)
  setStackDefraIdRewrite()
}

describe('getSignOutUrl', () => {
  restoreConfigAfterEach([
    'defraId.oidcDiscoveryUrl',
    'defraId.signOutRedirectUrl',
    ...STACK_DEFRA_ID_REWRITE_KEYS
  ])

  test('builds signout URL from discovery URL with post-logout redirect', async () => {
    configureSignOut(
      'https://mock-auth-server/some/tenant/.well-known/openid-configuration'
    )

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `https://mock-auth-server/some/tenant/signout${REDIRECT_QUERY}`
    )
  })

  test('handles discovery URL at root /.well-known/openid-configuration', async () => {
    configureSignOut(
      'https://mock-auth-server/.well-known/openid-configuration'
    )

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(`https://mock-auth-server/signout${REDIRECT_QUERY}`)
  })

  test('carries the rewritten browser-facing host into the signout URL', async () => {
    configureSignOut(
      'http://host.docker.internal:3007/idphub/b2c/b2c_1a/.well-known/openid-configuration'
    )

    const url = await getSignOutUrl({}, 'token')

    expect(url).toBe(
      `http://localhost:3007/idphub/b2c/b2c_1a/signout${REDIRECT_QUERY}`
    )
  })
})
