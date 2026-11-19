import Wreck from '@hapi/wreck'
import { getTraceId } from '@defra/hapi-tracing'
import { getOidcConfig } from './get-oidc-config.js'
import { config } from '../config/config.js'
import { measureExternalCall } from '../server/common/helpers/external-call-metrics.js'
import { providerSetting, serviceSignInProvider } from './identity-providers.js'

const TOKEN_ENDPOINT_TIMEOUT_MS = 3000

async function refreshTokens(refreshToken) {
  const { token_endpoint: url } = await getOidcConfig(serviceSignInProvider)

  const clientId = providerSetting(serviceSignInProvider, 'clientId')

  const payload = new URLSearchParams({
    client_id: clientId,
    client_secret: providerSetting(serviceSignInProvider, 'clientSecret'),
    grant_type: 'refresh_token',
    scope: `openid offline_access ${clientId}`,
    refresh_token: refreshToken,
    redirect_uri: providerSetting(serviceSignInProvider, 'redirectUrl')
  })

  const { payload: responsePayload } = await measureExternalCall(
    serviceSignInProvider.calls.tokenRefresh,
    () =>
      Wreck.post(url, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          [config.get('tracing.header')]: getTraceId() ?? ''
        },
        payload: payload.toString(),
        json: true,
        timeout: TOKEN_ENDPOINT_TIMEOUT_MS
      })
  )

  // Payload will include both a new access token and a new refresh token
  // Refresh tokens can only be used once, so the new refresh token should be stored in place of the old one
  return responsePayload
}

export { refreshTokens, TOKEN_ENDPOINT_TIMEOUT_MS }
