import nock from 'nock'
import { describe, expect, test } from 'vitest'

import { refuseOutboundHttp } from '../../src/server/common/test-helpers/real-mode.js'
import { appCookiesOf, createPageClient } from './page-client.js'

const ORIGIN = 'http://localhost:3002'
const HTTP_FOUND = 302

describe('#createPageClient cookies', () => {
  refuseOutboundHttp()

  test('Should hold the cookie a response sets, beside the cookies it started with', async () => {
    nock(ORIGIN).post('/address-book/add/address-type').reply(HTTP_FOUND, '', {
      location: '/address-book/add',
      'set-cookie': 'session=type-chosen; Path=/; HttpOnly'
    })
    const client = createPageClient(ORIGIN, [
      { name: 'sid', value: 'signed-in' }
    ])

    await client.submit('/address-book/add/address-type', {}, 'crumb-token')

    expect(client.cookies()).toEqual([
      { name: 'sid', value: 'signed-in' },
      { name: 'session', value: 'type-chosen' }
    ])
  })
})

describe('#appCookiesOf', () => {
  test("Should keep only the browser's cookies for the origin's host and its parent domains", async () => {
    const browser = {
      cookies: async () => [
        { name: 'sid', value: 'signed-in', domain: 'localhost' },
        { name: 'shared', value: 'parent', domain: '.localhost' },
        { name: 'idp', value: 'other-host', domain: 'defra-id.example' }
      ]
    }

    expect(await appCookiesOf(browser, ORIGIN)).toEqual([
      { name: 'sid', value: 'signed-in', domain: 'localhost' },
      { name: 'shared', value: 'parent', domain: '.localhost' }
    ])
  })
})
