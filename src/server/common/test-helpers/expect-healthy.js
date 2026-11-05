import { expect } from 'vitest'

import { statusCodes } from '../constants/status-codes.js'

export const expectHealthy = async (server) => {
  const { result, statusCode } = await server.inject({
    method: 'GET',
    url: '/health'
  })

  expect(result).toEqual({ message: 'success' })
  expect(statusCode).toBe(statusCodes.ok)
}
