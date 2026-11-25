import { createServer as createHttpServer } from 'node:http'

import Wreck from '@hapi/wreck'
import { afterAll, afterEach, beforeAll } from 'vitest'

import {
  hiddenIdmSignInProvider,
  providerSettingKey
} from '../../auth/identity-providers.js'
import { config } from '../../config/config.js'
import { statusCodes } from '../common/constants/status-codes.js'
import {
  configureIdm,
  idmDiscoveryDocument
} from '../common/test-helpers/idm-sign-in-settings.js'
import { recordModuleLoggerInfo } from '../common/test-helpers/module-logger-lines.js'
import { listenAsRefusingProxy } from '../common/test-helpers/refusing-proxy.js'
import { restoreConfigAfterEach } from '../common/test-helpers/restore-config-after-each.js'
import {
  startServerPastDiscoveryRetries,
  stopTestServer
} from '../common/test-helpers/test-server.js'
import { idmPaths } from './idm-sign-in.js'

const PROXIED = 'Wreck HTTPS calls to these hostnames go through the HTTP proxy'
const IDM_TOKEN_HOST = 'idm-token.example.test'
const IDM_KEYS_HOST = 'idm-keys.example.test'
const DISCOVERY_ATTEMPTS = 4

const listenOnLocalPort = (server) =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port))
  })

const close = (server) => new Promise((resolve) => server.close(resolve))

const listenAsIdmDiscovery = async () => {
  const discovery = createHttpServer((_request, response) => {
    response.writeHead(statusCodes.ok, { 'content-type': 'application/json' })
    response.end(
      JSON.stringify({
        ...idmDiscoveryDocument,
        token_endpoint: `https://${IDM_TOKEN_HOST}/token`,
        jwks_uri: `https://${IDM_KEYS_HOST}/keys`
      })
    )
  })
  const port = await listenOnLocalPort(discovery)
  return {
    discovery,
    discoveryUrl: `http://127.0.0.1:${port}/.well-known/openid-configuration`
  }
}

describe('IDM sign-in, behind an HTTP proxy', () => {
  configureIdm()
  restoreConfigAfterEach(['httpProxy'])
  const { entriesWith: infoLogs } = recordModuleLoggerInfo()
  const idmDiscoveryUrlKey = providerSettingKey(
    hiddenIdmSignInProvider,
    'oidcDiscoveryUrl'
  )
  const originalHttpsAgent = Wreck.agents.https
  let proxy
  let proxyUrl
  let requestLines
  let discovery
  let discoveryUrl
  let server

  beforeAll(async () => {
    ;({ proxy, proxyUrl, requestLines } = await listenAsRefusingProxy())
    ;({ discovery, discoveryUrl } = await listenAsIdmDiscovery())
  })

  afterEach(async () => {
    await stopTestServer(server)
    Wreck.agents.https = originalHttpsAgent
    requestLines.length = 0
  })

  afterAll(async () => {
    await close(proxy)
    await close(discovery)
  })

  test('Should send IDM discovery to the proxy as a tunnel to the IDM host', async () => {
    config.set('httpProxy', proxyUrl)

    server = await startServerPastDiscoveryRetries()

    expect(requestLines).toEqual(
      Array(DISCOVERY_ATTEMPTS).fill('CONNECT idm.example.test:443 HTTP/1.1')
    )
    expect(infoLogs(PROXIED)).toEqual([
      { fields: { hostnames: ['idm.example.test'] }, message: PROXIED }
    ])
    const idmSignIn = await server.inject({
      method: 'GET',
      url: idmPaths.signIn
    })
    expect(idmSignIn.statusCode).toBe(statusCodes.notFound)
  })

  test('Should send HTTPS calls to the IDM token and keys hosts to the proxy once discovery succeeds', async () => {
    config.set('httpProxy', proxyUrl)
    config.set(idmDiscoveryUrlKey, discoveryUrl)

    server = await startServerPastDiscoveryRetries()

    await expect(Wreck.get(`https://${IDM_TOKEN_HOST}/token`)).rejects.toThrow()
    await expect(Wreck.get(`https://${IDM_KEYS_HOST}/keys`)).rejects.toThrow()
    expect(requestLines).toEqual([
      `CONNECT ${IDM_TOKEN_HOST}:443 HTTP/1.1`,
      `CONNECT ${IDM_KEYS_HOST}:443 HTTP/1.1`
    ])
    expect(infoLogs(PROXIED)).toEqual([
      { fields: { hostnames: ['127.0.0.1'] }, message: PROXIED },
      {
        fields: { hostnames: ['127.0.0.1', IDM_TOKEN_HOST, IDM_KEYS_HOST] },
        message: PROXIED
      }
    ])
    const idmSignIn = await server.inject({
      method: 'GET',
      url: idmPaths.signIn
    })
    expect(idmSignIn.statusCode).toBe(statusCodes.ok)
  })

  test('Should send no IDM call through a proxy when none is configured', async () => {
    config.set('httpProxy', null)
    config.set(idmDiscoveryUrlKey, discoveryUrl)

    server = await startServerPastDiscoveryRetries()

    expect(infoLogs(PROXIED)).toEqual([])
    expect(Wreck.agents.https).toBe(originalHttpsAgent)
  })
})
