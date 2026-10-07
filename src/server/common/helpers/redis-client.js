import { Cluster, Redis } from 'ioredis'

import { createLogger } from './logging/logger.js'

/**
 * Setup Redis and provide a redis client
 *
 * Local development - 1 Redis instance
 * Environments - Elasticache / Redis Cluster with username and password
 *
 * ioredis 6 defaults to RESP3, a HELLO 3 handshake with AUTH inline.
 * `protocol: 2` keeps the RESP2 wire behaviour of ioredis 5, which is
 * what the ElastiCache ACL users are proven against.
 */
export function buildRedisClient(redisConfig) {
  const logger = createLogger()
  const port = 6379
  const db = 0
  const protocol = 2
  const keyPrefix = redisConfig.keyPrefix
  const host = redisConfig.host
  let redisClient

  const credentials =
    redisConfig.username === ''
      ? {}
      : {
          username: redisConfig.username,
          password: redisConfig.password
        }
  const tls = redisConfig.useTLS ? { tls: {} } : {}

  if (redisConfig.useSingleInstanceCache) {
    redisClient = new Redis({
      port,
      host,
      db,
      protocol,
      keyPrefix,
      ...credentials,
      ...tls
    })
  } else {
    redisClient = new Cluster(
      [
        {
          host,
          port
        }
      ],
      {
        keyPrefix,
        slotsRefreshTimeout: 10000,
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: {
          db,
          protocol,
          ...credentials,
          ...tls
        }
      }
    )
  }

  redisClient.on('connect', () => {
    logger.info('Connected to Redis server')
  })

  redisClient.on('error', (error) => {
    logger.error(`Redis connection error ${error}`)
  })

  return redisClient
}
