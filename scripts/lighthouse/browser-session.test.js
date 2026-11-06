import nock from 'nock'
import { TimeoutError } from 'puppeteer'
import { describe, expect, test } from 'vitest'

import { refuseOutboundHttp } from '../../src/server/common/test-helpers/real-mode.js'
import {
  chooseAddressTypeInBrowser,
  waitForSignInForm
} from './browser-session.js'

const ORIGIN = 'http://localhost:3002'
const CRUMB = 'crumb-token'
const HTTP_OK = 200
const HTTP_FOUND = 302

const fakeBrowser = (cookies) => {
  const setCookies = []
  return {
    cookies: async () => cookies,
    setCookie: async (...set) => {
      setCookies.push(...set)
    },
    setCookies
  }
}

const fakePage = (waitForSelector) => ({ waitForSelector })

describe('#chooseAddressTypeInBrowser', () => {
  refuseOutboundHttp()

  test("Should choose the address type with the browser's app cookies and give the browser the session it was saved in", async () => {
    const typeStep = nock(ORIGIN)
      .get('/address-book/add/address-type')
      .matchHeader('cookie', 'sid=signed-in')
      .reply(
        HTTP_OK,
        `<html><head><meta name="csrf-token" content="${CRUMB}"></head><body><h1>Address type</h1></body></html>`
      )
      .post('/address-book/add/address-type', {
        crumb: CRUMB,
        addressType: 'ORIGIN_OR_CONSIGNOR'
      })
      .reply(HTTP_FOUND, '', {
        location: '/address-book/add',
        'set-cookie': 'session=type-chosen; Path=/; HttpOnly'
      })
    const browser = fakeBrowser([
      { name: 'sid', value: 'signed-in', domain: 'localhost' },
      { name: 'idp', value: 'other-host', domain: 'defra-id.example' }
    ])

    await chooseAddressTypeInBrowser(browser, ORIGIN)

    expect(typeStep.isDone()).toBe(true)
    expect(browser.setCookies).toEqual([
      { name: 'sid', value: 'signed-in', domain: 'localhost' },
      { name: 'session', value: 'type-chosen', domain: 'localhost' }
    ])
  })
})

describe('#waitForSignInForm', () => {
  test('Should return the sign-in field once it shows', async () => {
    const field = { name: 'crn' }

    await expect(waitForSignInForm(fakePage(async () => field))).resolves.toBe(
      field
    )
  })

  test('Should return nothing when the sign-in field never shows', async () => {
    await expect(
      waitForSignInForm(
        fakePage(async () => {
          throw new TimeoutError('Waiting for selector failed')
        })
      )
    ).resolves.toBeNull()
  })

  test('Should pass on any other failure', async () => {
    const failure = new Error('Target closed')

    await expect(
      waitForSignInForm(
        fakePage(async () => {
          throw failure
        })
      )
    ).rejects.toBe(failure)
  })
})
