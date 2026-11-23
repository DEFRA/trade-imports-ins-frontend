import Wreck from '@hapi/wreck'
import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../config/config.js'
import { measureExternalCall } from '../server/common/helpers/external-call-metrics.js'
import { providerSetting } from './identity-providers.js'
import { withServerSideEndpointsAtDiscoveryHostname } from './defra-id-hostnames.js'

const OIDC_DOCUMENT_TIMEOUT_MS = 1000

async function getOidcConfig(provider) {
  const discoveryUrl = providerSetting(provider, 'oidcDiscoveryUrl')
  const { payload } = await measureExternalCall(
    provider.calls.openidConfiguration,
    () =>
      Wreck.get(discoveryUrl, {
        headers: { [config.get('tracing.header')]: getTraceId() ?? '' },
        json: true,
        timeout: OIDC_DOCUMENT_TIMEOUT_MS
      })
  )

  return withServerSideEndpointsAtDiscoveryHostname(payload, discoveryUrl)
}

export { getOidcConfig, OIDC_DOCUMENT_TIMEOUT_MS }
