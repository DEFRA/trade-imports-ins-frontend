import { describe, expect, test } from 'vitest'

import {
  ADDRESS_ID,
  MALFORMED_ADDRESS_ID
} from '../../../common/test-helpers/address-book-requests.js'
import {
  recordIdParams,
  redirectingRecordIdRouteOptions
} from './record-id-params.js'

describe('#recordIdParams', () => {
  test('accepts a 24-character hex Mongo ObjectId', () => {
    const { error } = recordIdParams.validate({
      id: ADDRESS_ID
    })

    expect(error).toBeUndefined()
  })

  test('rejects malformed ids', () => {
    const { error } = recordIdParams.validate({ id: MALFORMED_ADDRESS_ID })

    expect(error).toBeDefined()
    expect(error.details[0].message).toBe('Enter a valid record id')
  })
})

describe('#redirectingRecordIdRouteOptions', () => {
  test('Should redirect from failAction to the path fallbackPathOf gives', () => {
    const fallbackPath = '/address-book'
    const options = redirectingRecordIdRouteOptions(
      (request) => request.query.returnTo
    )
    const toolkit = {
      redirect: (path) => ({ takeover: () => ({ redirectedTo: path }) })
    }
    const request = {
      params: { id: MALFORMED_ADDRESS_ID },
      query: { returnTo: fallbackPath }
    }

    const failActionResponse = options.validate.failAction(request, toolkit)

    expect(failActionResponse).toEqual({ redirectedTo: fallbackPath })
  })

  test('Should validate params with recordIdParams behind session auth', () => {
    const options = redirectingRecordIdRouteOptions(() => '/address-book')

    expect(options.validate.params).toBe(recordIdParams)
    expect(options.auth).toBe('session')
  })
})
