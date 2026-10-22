import { describe, expect, test } from 'vitest'

import {
  addressIdParams,
  addressIdOrRedirectRouteOptions
} from './address-id-params.js'

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

describe('#addressIdOrRedirectRouteOptions', () => {
  test('Should redirect a request that fails id validation to the path fallbackPathOf gives', () => {
    const fallbackPath = '/address-book'
    const options = addressIdOrRedirectRouteOptions(
      (request) => request.query.returnTo
    )
    const toolkit = {
      redirect: (path) => ({ takeover: () => ({ redirectedTo: path }) })
    }
    const request = {
      params: { id: 'not-a-valid-id' },
      query: { returnTo: fallbackPath }
    }

    const failActionResponse = options.validate.failAction(request, toolkit)

    expect(failActionResponse).toEqual({ redirectedTo: fallbackPath })
  })

  test('Should validate params with addressIdParams behind session auth', () => {
    const options = addressIdOrRedirectRouteOptions(() => '/address-book')

    expect(options.validate.params).toBe(addressIdParams)
    expect(options.auth).toBe('session')
  })
})
