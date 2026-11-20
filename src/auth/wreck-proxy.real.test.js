import { createServer } from 'node:net'
import Wreck from '@hapi/wreck'

import { sendWreckHttpsCallsThroughProxy } from './wreck-agent.js'

const listenAsRefusingProxy = () =>
  new Promise((resolve) => {
    const requestLines = []
    const proxy = createServer((socket) => {
      socket.once('data', (chunk) => {
        requestLines.push(chunk.toString().split('\r\n')[0])
        socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n')
      })
    })
    proxy.listen(0, '127.0.0.1', () =>
      resolve({
        proxy,
        proxyUrl: `http://127.0.0.1:${proxy.address().port}`,
        requestLines
      })
    )
  })

describe('sendWreckHttpsCallsThroughProxy', () => {
  const originalHttpsAgent = Wreck.agents.https
  let proxy
  let proxyUrl
  let requestLines

  beforeAll(async () => {
    ;({ proxy, proxyUrl, requestLines } = await listenAsRefusingProxy())
  })

  afterEach(() => {
    Wreck.agents.https = originalHttpsAgent
    requestLines.length = 0
  })

  afterAll(async () => {
    await new Promise((resolve) => proxy.close(resolve))
  })

  test('sends an HTTPS Wreck call to a listed hostname to the proxy as a tunnel to that host', async () => {
    sendWreckHttpsCallsThroughProxy(proxyUrl, ['idm.example.test'])

    await expect(
      Wreck.get('https://idm.example.test/.well-known/openid-configuration')
    ).rejects.toThrow()

    expect(requestLines).toEqual(['CONNECT idm.example.test:443 HTTP/1.1'])
  })

  test('sends an HTTPS Wreck call to any other hostname direct, never to the proxy', async () => {
    sendWreckHttpsCallsThroughProxy(proxyUrl, ['idm.example.test'])

    await expect(
      Wreck.get(
        'https://defra-id-stub.invalid/.well-known/openid-configuration'
      )
    ).rejects.toThrow('getaddrinfo ENOTFOUND defra-id-stub.invalid')

    expect(requestLines).toEqual([])
  })

  test('replaces the hostnames an earlier call listed', async () => {
    sendWreckHttpsCallsThroughProxy(proxyUrl, ['first.example.test'])
    sendWreckHttpsCallsThroughProxy(proxyUrl, ['second.example.test'])

    await expect(
      Wreck.get('https://second.example.test/keys')
    ).rejects.toThrow()
    await expect(Wreck.get('https://first.example.test/keys')).rejects.toThrow()

    expect(requestLines).toEqual(['CONNECT second.example.test:443 HTTP/1.1'])
  })
})
