import { vi } from 'vitest'

import { Cluster, Redis } from 'ioredis'

import { config } from '#/config/config.js'
import { buildRedisClient } from './redis-client.js'

vi.mock('ioredis', () => ({
  ...vi.importActual('ioredis'),
  Cluster: vi.fn(function () {
    return { on: () => ({}) }
  }),
  Redis: vi.fn(function () {
    return { on: () => ({}) }
  })
}))

describe('#buildRedisClient', () => {
  beforeAll(() => {
    vi.stubEnv('REDIS_HOST', '127.0.0.1')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  describe('When Redis Single InstanceCache is requested', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      buildRedisClient({ ...config.get('redis'), host: '127.0.0.1' })
    })

    test('Should instantiate a single Redis client', () => {
      expect(Redis).toHaveBeenCalledWith({
        db: 0,
        host: '127.0.0.1',
        keyPrefix: 'trade-imports-ins-frontend:',
        port: 6379
      })
    })
  })

  describe('When a Redis Cluster is requested', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      buildRedisClient({
        ...config.get('redis'),
        host: '127.0.0.1',
        username: 'redis-user',
        password: 'pass',
        useTLS: true,
        useSingleInstanceCache: false
      })
    })

    test('Should instantiate a Redis Cluster client', () => {
      expect(Cluster).toHaveBeenCalledWith(
        [{ host: '127.0.0.1', port: 6379 }],
        {
          dnsLookup: expect.any(Function),
          keyPrefix: 'trade-imports-ins-frontend:',
          slotsRefreshTimeout: 10000,
          redisOptions: {
            db: 0,
            username: 'redis-user',
            password: 'pass',
            tls: {}
          }
        }
      )
    })
  })
})
