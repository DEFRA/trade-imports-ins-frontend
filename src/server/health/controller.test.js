import { statusCodes } from '../common/constants/status-codes.js'
import {
  startTestServer,
  stopTestServer
} from '../common/test-helpers/test-server.js'

describe('#healthController', () => {
  let server

  beforeAll(async () => {
    server = await startTestServer()
  })

  afterAll(async () => {
    await stopTestServer(server)
  })

  test('Should answer GET /health with 200 and a success message', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(result).toEqual({ message: 'success' })
    expect(statusCode).toBe(statusCodes.ok)
  })
})
