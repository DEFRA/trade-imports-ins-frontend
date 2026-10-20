import { describe, expect, test, vi } from 'vitest'

import { addressIdParams, deadLinkRouteOptions } from './address-id-params.js'

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

describe('#deadLinkRouteOptions', () => {
  test('deadLinkRouteOptions redirects a failed id to the fallback path', () => {
    const fallbackPathOf = vi.fn(() => '/address-book')
    const options = deadLinkRouteOptions(fallbackPathOf)
    const takeover = vi.fn(() => 'taken-over')
    const toolkit = { redirect: vi.fn(() => ({ takeover })) }
    const request = { query: {} }

    const result = options.validate.failAction(request, toolkit)

    expect(fallbackPathOf).toHaveBeenCalledWith(request)
    expect(toolkit.redirect).toHaveBeenCalledWith('/address-book')
    expect(result).toBe('taken-over')
    expect(options.validate.params).toBe(addressIdParams)
    expect(options.auth).toBe('session')
  })
})
