import { describe, expect, test } from 'vitest'

import { addressIdParams } from './address-id-params.js'

describe('#addressIdParams', () => {
  test('accepts a 24-character hex Mongo ObjectId', () => {
    const { error } = addressIdParams.validate({
      id: '665f1c2ab3e4d51a2c9d0e77'
    })

    expect(error).toBeUndefined()
  })

  test('rejects malformed ids', () => {
    const { error } = addressIdParams.validate({ id: 'not-a-valid-id' })

    expect(error).toBeDefined()
    expect(error.details[0].message).toBe('Enter a valid address id')
  })
})
