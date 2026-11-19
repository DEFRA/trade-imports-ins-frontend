import { createPublicKey } from 'node:crypto'
import Wreck from '@hapi/wreck'
import Jwt from '@hapi/jwt'
import { getTraceId } from '@defra/hapi-tracing'
import { getOidcConfig, OIDC_DOCUMENT_TIMEOUT_MS } from './get-oidc-config.js'
import { config } from '../config/config.js'
import { measureExternalCall } from '../server/common/helpers/external-call-metrics.js'
import { defraIdProvider, providerSetting } from './identity-providers.js'

async function verifyToken(token, provider = defraIdProvider) {
  const oidcConfig = await getOidcConfig(provider)
  const { jwks_uri: uri, issuer } = oidcConfig

  const { payload } = await measureExternalCall(provider.calls.jwks, () =>
    Wreck.get(uri, {
      headers: { [config.get('tracing.header')]: getTraceId() ?? '' },
      json: true,
      timeout: OIDC_DOCUMENT_TIMEOUT_MS
    })
  )

  const artifacts = Jwt.token.decode(token)
  const { kid } = artifacts.decoded.header
  const signingJwk = payload.keys.find((key) => key.kid === kid)
  if (!signingJwk) {
    throw new Error(`No signing key ${kid} served`)
  }

  const pem = createPublicKey({ key: signingJwk, format: 'jwk' }).export({
    type: 'spki',
    format: 'pem'
  })

  Jwt.token.verify(
    artifacts,
    { key: pem, algorithm: 'RS256' },
    claimChecksFor(provider, issuer)
  )
}

const claimChecksFor = (provider, issuer) =>
  provider.verifiesAudienceAndIssuer
    ? { aud: providerSetting(provider, 'clientId'), iss: issuer }
    : {}

export { verifyToken }
