import { generateKeyPairSync } from 'node:crypto'

import Jwt from '@hapi/jwt'

export const generateSigningKey = (kid) => {
  const rsaModulusBits = 2048
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: rsaModulusBits
  })
  return {
    kid,
    publicJwk: { ...publicKey.export({ format: 'jwk' }), kid },
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' })
  }
}

export const signToken = (
  { privatePem, kid },
  claims,
  { headerKid = kid } = {}
) => {
  const tokenTtlSeconds = 60
  return Jwt.token.generate(
    claims,
    { key: privatePem, algorithm: 'RS256' },
    { ttlSec: tokenTtlSeconds, header: { kid: headerKid } }
  )
}
