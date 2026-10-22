import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  deadLinkDestination,
  landsOnAddressBook,
  honouredReturnOf,
  returnDestinationOf,
  pathWithReturn
} from './return-to.js'

const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'
const OTHER_ADDRESS_ID = '111111111111111111111111'
const ADDRESS_BOOK_PATH = '/address-book'
const ANIMALS_FRONTEND_ORIGIN = new URL(
  config.get('tradeImportsAnimalsFrontend.baseUrl')
).origin
const PLANTS_FRONTEND_ORIGIN = new URL(
  config.get('tradeImportsPlantsFrontend.baseUrl')
).origin
const LIVE_ANIMALS_URL = `${ANIMALS_FRONTEND_ORIGIN}/live-animals/notifications/abc`
const GERMINAL_URL = `${ANIMALS_FRONTEND_ORIGIN}/germinal-products/notifications`

const requestWithReturn = (returnQuery) => ({ query: { return: returnQuery } })

const originalStubMode = config.get('stubMode')

beforeEach(() => {
  config.set('stubMode', false)
})

afterEach(() => {
  config.set('stubMode', originalStubMode)
})

describe('#honouredReturnOf', () => {
  test.each(['/', '/address-book?page=2'])(
    'Should honour the page of this service %s',
    (path) => {
      expect(honouredReturnOf(requestWithReturn(path))).toBe(path)
    }
  )

  test.each([
    ['/€', '/%E2%82%AC'],
    ['/\0', '/'],
    ['/a\0b', '/a%00b'],
    ['/café?q=é', '/caf%C3%A9?q=%C3%A9']
  ])(
    'Should normalise the page of this service %s to %s',
    (path, encodedPath) => {
      expect(honouredReturnOf(requestWithReturn(path))).toBe(encodedPath)
    }
  )

  test.each([
    ['a missing value', undefined],
    ['an empty value', ''],
    ['an array', ['/', '/x']],
    ['a protocol-relative URL', '//evil.example/x'],
    ['a value not starting with /', 'address-book'],
    ['another origin', 'https://evil.example/live-animals'],
    [
      'the plants frontend origin',
      `${PLANTS_FRONTEND_ORIGIN}/high-risk-plants`
    ],
    [
      'userinfo that spoofs the animals origin',
      `${ANIMALS_FRONTEND_ORIGIN}@evil.example/`
    ],
    ['a longer host', `${ANIMALS_FRONTEND_ORIGIN}.evil.example/`],
    ['a backslash', '/\\evil.example'],
    ['a line break', '/address-book\r\n/x'],
    ['a tab making it protocol-relative', '/\t/evil.example']
  ])('Should ignore %s', (_name, rejectedReturn) => {
    expect(honouredReturnOf(requestWithReturn(rejectedReturn))).toBeNull()
  })

  test('Should ignore a request with no query', () => {
    expect(honouredReturnOf({})).toBeNull()
  })

  test.each([LIVE_ANIMALS_URL, GERMINAL_URL])(
    'Should honour the animals frontend URL %s outside stub mode',
    (animalsUrl) => {
      expect(honouredReturnOf(requestWithReturn(animalsUrl))).toBe(
        new URL(animalsUrl).href
      )
    }
  )

  test('Should ignore an animals frontend URL in stub mode but still honour a path', () => {
    config.set('stubMode', true)

    expect(honouredReturnOf(requestWithReturn(LIVE_ANIMALS_URL))).toBeNull()
    expect(honouredReturnOf(requestWithReturn('/'))).toBe('/')
  })
})

describe('#pathWithReturn', () => {
  const path = `${ADDRESS_BOOK_PATH}/x`

  test.each([null, ADDRESS_BOOK_PATH])(
    'Should give the bare path for %s',
    (honouredReturn) => {
      expect(pathWithReturn(path, honouredReturn)).toBe(path)
    }
  )

  test('Should append the return', () => {
    expect(pathWithReturn(path, '/')).toBe(`${path}?return=%2F`)
  })

  test('Should encode an animals frontend URL', () => {
    expect(pathWithReturn(path, LIVE_ANIMALS_URL)).toBe(
      `${path}?return=${encodeURIComponent(LIVE_ANIMALS_URL)}`
    )
  })
})

describe('#returnDestinationOf', () => {
  test('Should give a return that is not one of the address’s own pages', () => {
    expect(returnDestinationOf(ADDRESS_ID, '/')).toBe('/')
    expect(
      returnDestinationOf(
        ADDRESS_ID,
        `${ADDRESS_BOOK_PATH}/${OTHER_ADDRESS_ID}`
      )
    ).toBe(`${ADDRESS_BOOK_PATH}/${OTHER_ADDRESS_ID}`)
  })

  test.each([
    ['no return', null],
    ['its view page', `${ADDRESS_BOOK_PATH}/${ADDRESS_ID}`],
    ['its edit page', `${ADDRESS_BOOK_PATH}/${ADDRESS_ID}/edit`],
    [
      'its delete page with a query',
      `${ADDRESS_BOOK_PATH}/${ADDRESS_ID}/delete?x=1`
    ]
  ])('Should give the address book for %s', (_name, honouredReturn) => {
    expect(returnDestinationOf(ADDRESS_ID, honouredReturn)).toBe(
      ADDRESS_BOOK_PATH
    )
  })

  test('Should give an animals frontend URL unchanged', () => {
    expect(returnDestinationOf(ADDRESS_ID, LIVE_ANIMALS_URL)).toBe(
      LIVE_ANIMALS_URL
    )
  })
})

describe('#landsOnAddressBook', () => {
  test.each([ADDRESS_BOOK_PATH, `${ADDRESS_BOOK_PATH}?search=x`])(
    'Should be true for %s',
    (path) => {
      expect(landsOnAddressBook(path)).toBe(true)
    }
  )

  test.each(['/', `${ADDRESS_BOOK_PATH}/${ADDRESS_ID}`, LIVE_ANIMALS_URL])(
    'Should be false for %s',
    (pathOrUrl) => {
      expect(landsOnAddressBook(pathOrUrl)).toBe(false)
    }
  )
})

describe('#deadLinkDestination', () => {
  test('Should give an honoured return even for a malformed id', () => {
    expect(
      deadLinkDestination({
        params: { id: 'not-a-valid-id' },
        query: { return: '/' }
      })
    ).toBe('/')
  })

  test('Should give the address book when there is no return', () => {
    expect(deadLinkDestination({ params: { id: ADDRESS_ID }, query: {} })).toBe(
      ADDRESS_BOOK_PATH
    )
  })
})
