import { startTestServer, stopTestServer } from '../test-helpers/test-server.js'

import { siblingFrontendBaseUrls } from '../../../config/config.js'

describe('#contentSecurityPolicy', () => {
  let server

  beforeAll(async () => {
    server = await startTestServer()
  })

  afterAll(async () => {
    await stopTestServer(server)
  })

  test('Should set the CSP policy header', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(resp.headers['content-security-policy']).toBeDefined()
  })

  test('Should allow self and every sibling frontend origin in form-action', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/health'
    })

    const [, formAction] = /form-action ([^;]*)/.exec(
      resp.headers['content-security-policy']
    )

    expect(formAction.trim().split(' ')).toEqual([
      "'self'",
      ...siblingFrontendBaseUrls.map((baseUrl) => new URL(baseUrl).origin)
    ])
  })
})
