import { generateKeyPairSync } from 'node:crypto'

import Jwt from '@hapi/jwt'

const RSA_MODULUS_BITS = 2048
const TOKEN_TTL_SECONDS = 60

export const generateSigningKey = (kid) => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: RSA_MODULUS_BITS
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
) =>
  Jwt.token.generate(
    claims,
    { key: privatePem, algorithm: 'RS256' },
    { ttlSec: TOKEN_TTL_SECONDS, header: { kid: headerKid } }
  )
