import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { Writable } from 'node:stream'
import Wreck from '@hapi/wreck'
import { pino } from 'pino'

import { config } from '../config/config.js'
import { listenAsRefusingProxy } from '../server/common/test-helpers/refusing-proxy.js'
import { restoreConfigAfterEach } from '../server/common/test-helpers/restore-config-after-each.js'
import {
  createRetryingKeepAliveAgent,
  proxyWreckHttpsCallsTo,
  useRetryingKeepAliveAgentForWreck
} from './wreck-agent.js'

const RETRY_WARNING = 'Connection did not open, retrying once'

const listen = async (server, port = 0) => {
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
  return server.address().port
}

const close = (server) => new Promise((resolve) => server.close(resolve))

const answeringWithUrl = () =>
  createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ url: request.url }))
  })

const portNobodyListensOn = async () => {
  const server = createServer()
  const port = await listen(server)
  await close(server)
  return port
}

const listenAsRecordingTarget = async () => {
  const connectionAddresses = []
  const target = createNetServer((socket) => {
    connectionAddresses.push(socket.remoteAddress)
    socket.destroy()
  })
  const port = await listen(target)
  return {
    target,
    targetUrl: `https://127.0.0.1:${port}`,
    connectionAddresses
  }
}

const loggerCalling = (onLine) =>
  pino(
    { level: 'warn' },
    new Writable({
      write(chunk, _encoding, done) {
        onLine(JSON.parse(chunk))
        done()
      }
    })
  )

describe('createRetryingKeepAliveAgent over a real connection', () => {
  test('connects on the second attempt after the first is refused, and logs the retry with the port', async () => {
    const port = await portNobodyListensOn()
    const server = answeringWithUrl()
    const warnings = []
    const agent = createRetryingKeepAliveAgent(
      loggerCalling((line) => {
        warnings.push({ msg: line.msg, port: line.port, code: line.err.code })
        server.listen(port, '127.0.0.1')
      })
    )

    try {
      const { payload } = await Wreck.get(`http://127.0.0.1:${port}/keys`, {
        agent,
        json: true
      })

      expect({ warnings, payload }).toEqual({
        warnings: [{ msg: RETRY_WARNING, port, code: 'ECONNREFUSED' }],
        payload: { url: '/keys' }
      })
    } finally {
      agent.destroy()
      await close(server)
    }
  })

  test('fails with the second refusal when the retry is refused too', async () => {
    const port = await portNobodyListensOn()
    const warnings = []
    const agent = createRetryingKeepAliveAgent(
      loggerCalling((line) => warnings.push(line.msg))
    )

    try {
      const failure = await Wreck.get(`http://127.0.0.1:${port}/keys`, {
        agent
      }).catch((error) => error)

      expect({ code: failure.code, warnings }).toEqual({
        code: 'ECONNREFUSED',
        warnings: [RETRY_WARNING]
      })
    } finally {
      agent.destroy()
    }
  })

  test('sends calls made one after another over one connection', async () => {
    const server = answeringWithUrl()
    let connections = 0
    server.on('connection', () => {
      connections += 1
    })
    const port = await listen(server)
    const agent = createRetryingKeepAliveAgent(loggerCalling(() => {}))

    try {
      await Wreck.post(`http://127.0.0.1:${port}/token`, {
        agent,
        payload: 'grant_type=authorization_code'
      })
      await Wreck.get(`http://127.0.0.1:${port}/keys`, { agent })

      expect(connections).toBe(1)
    } finally {
      agent.destroy()
      await close(server)
    }
  })
})

describe('useRetryingKeepAliveAgentForWreck', () => {
  const originalAgent = Wreck.agents.http

  afterEach(() => {
    Wreck.agents.http.destroy()
    Wreck.agents.http = originalAgent
  })

  test('sends a Wreck call made without an agent over a kept-alive connection', async () => {
    const server = answeringWithUrl()
    let connections = 0
    server.on('connection', () => {
      connections += 1
    })
    const port = await listen(server)
    useRetryingKeepAliveAgentForWreck(loggerCalling(() => {}))

    try {
      await Wreck.get(`http://127.0.0.1:${port}/openid-configuration`)
      await Wreck.get(`http://127.0.0.1:${port}/keys`)

      expect(connections).toBe(1)
    } finally {
      await close(server)
    }
  })
})

describe('proxyWreckHttpsCallsTo', () => {
  restoreConfigAfterEach(['httpProxy'])
  const originalHttpsAgent = Wreck.agents.https
  const logger = loggerCalling(() => {})
  let proxy
  let proxyUrl
  let requestLines

  beforeAll(async () => {
    ;({ proxy, proxyUrl, requestLines } = await listenAsRefusingProxy())
  })

  beforeEach(() => {
    config.set('httpProxy', proxyUrl)
  })

  afterEach(() => {
    Wreck.agents.https = originalHttpsAgent
    requestLines.length = 0
  })

  afterAll(async () => {
    await close(proxy)
  })

  test('sends an HTTPS Wreck call to a listed hostname to the proxy as a tunnel to that host', async () => {
    proxyWreckHttpsCallsTo(['idm.example.test'], logger)

    await expect(
      Wreck.get('https://idm.example.test/.well-known/openid-configuration')
    ).rejects.toThrow()

    expect(requestLines).toEqual(['CONNECT idm.example.test:443 HTTP/1.1'])
  })

  test('sends an HTTPS Wreck call to any other hostname direct, never to the proxy', async () => {
    const { target, targetUrl, connectionAddresses } =
      await listenAsRecordingTarget()
    proxyWreckHttpsCallsTo(['idm.example.test'], logger)

    try {
      await expect(
        Wreck.get(`${targetUrl}/.well-known/openid-configuration`)
      ).rejects.toThrow()

      expect({ connectionAddresses, requestLines }).toEqual({
        connectionAddresses: ['127.0.0.1'],
        requestLines: []
      })
    } finally {
      await close(target)
    }
  })

  test('replaces the hostnames an earlier call listed', async () => {
    const { target, targetUrl, connectionAddresses } =
      await listenAsRecordingTarget()
    proxyWreckHttpsCallsTo(['127.0.0.1'], logger)
    proxyWreckHttpsCallsTo(['second.example.test'], logger)

    try {
      await expect(
        Wreck.get('https://second.example.test/keys')
      ).rejects.toThrow()
      await expect(Wreck.get(`${targetUrl}/keys`)).rejects.toThrow()

      expect({ connectionAddresses, requestLines }).toEqual({
        connectionAddresses: ['127.0.0.1'],
        requestLines: ['CONNECT second.example.test:443 HTTP/1.1']
      })
    } finally {
      await close(target)
    }
  })

  test("leaves Wreck's HTTPS agent as it is when no HTTP proxy is configured", () => {
    config.set('httpProxy', null)

    proxyWreckHttpsCallsTo(['idm.example.test'], logger)

    expect(Wreck.agents.https).toBe(originalHttpsAgent)
  })
})
