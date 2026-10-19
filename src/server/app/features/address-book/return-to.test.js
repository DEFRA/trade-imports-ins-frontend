import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  deadLinkDestination,
  landsOnAddressBook,
  readReturn,
  returnAwayFrom,
  withReturn
} from './return-to.js'

const ID = '665f1c2ab3e4d51a2c9d0e77'
const OTHER_ID = '111111111111111111111111'
const LIST = '/address-book'
const ANIMALS = new URL(config.get('tradeImportsAnimalsFrontend.baseUrl'))
  .origin
const LIVE_ANIMALS_URL = `${ANIMALS}/live-animals/notifications/abc`
const GERMINAL_URL = `${ANIMALS}/germinal-products/notifications`

const returning = (value) => ({ query: { return: value } })

const originalStubMode = config.get('stubMode')

afterAll(() => {
  config.set('stubMode', originalStubMode)
})

describe('#readReturn', () => {
  beforeEach(() => {
    config.set('stubMode', false)
  })

  test.each(['/', '/address-book?page=2'])(
    'Should honour the page of this service %s',
    (value) => {
      expect(readReturn(returning(value))).toBe(value)
    }
  )

  test.each([
    ['a missing value', undefined],
    ['an empty value', ''],
    ['an array', ['/', '/x']],
    ['a protocol-relative URL', '//evil.example/x'],
    ['a value not starting with /', 'address-book'],
    ['another origin', 'https://evil.example/live-animals'],
    ['the plants frontend origin', 'http://localhost:3003/high-risk-plants'],
    ['userinfo that spoofs the animals origin', `${ANIMALS}@evil.example/`],
    ['a longer host', 'http://localhost:3000.evil.example/'],
    ['a backslash', '/\\evil.example'],
    ['a line break', '/address-book\r\n/x'],
    ['a tab making it protocol-relative', '/\t/evil.example']
  ])('Should ignore %s', (_name, value) => {
    expect(readReturn(returning(value))).toBeNull()
  })

  test('Should ignore a request with no query', () => {
    expect(readReturn({})).toBeNull()
  })

  test.each([LIVE_ANIMALS_URL, GERMINAL_URL])(
    'Should honour the animals frontend URL %s outside stub mode',
    (value) => {
      expect(readReturn(returning(value))).toBe(new URL(value).href)
    }
  )

  test('Should ignore an animals frontend URL in stub mode but still honour a path', () => {
    config.set('stubMode', true)

    expect(readReturn(returning(LIVE_ANIMALS_URL))).toBeNull()
    expect(readReturn(returning('/'))).toBe('/')
  })
})

describe('#withReturn', () => {
  const path = `${LIST}/x`

  test.each([null, LIST])('Should give the bare path for %s', (returnTo) => {
    expect(withReturn(path, returnTo)).toBe(path)
  })

  test('Should append the return', () => {
    expect(withReturn(path, '/')).toBe(`${path}?return=%2F`)
  })

  test('Should encode an animals frontend URL', () => {
    expect(withReturn(path, LIVE_ANIMALS_URL)).toBe(
      `${path}?return=${encodeURIComponent(LIVE_ANIMALS_URL)}`
    )
  })
})

describe('#returnAwayFrom', () => {
  test('Should give a return that is not one of the address’s own pages', () => {
    expect(returnAwayFrom(ID, '/')).toBe('/')
    expect(returnAwayFrom(ID, `${LIST}/${OTHER_ID}`)).toBe(
      `${LIST}/${OTHER_ID}`
    )
  })

  test.each([
    ['no return', null],
    ['its view page', `${LIST}/${ID}`],
    ['its edit page', `${LIST}/${ID}/edit`],
    ['its delete page with a query', `${LIST}/${ID}/delete?x=1`]
  ])('Should give the list for %s', (_name, returnTo) => {
    expect(returnAwayFrom(ID, returnTo)).toBe(LIST)
  })

  test('Should give an animals frontend URL unchanged', () => {
    expect(returnAwayFrom(ID, LIVE_ANIMALS_URL)).toBe(LIVE_ANIMALS_URL)
  })
})

describe('#landsOnAddressBook', () => {
  test.each([LIST, `${LIST}?search=x`])('Should be true for %s', (value) => {
    expect(landsOnAddressBook(value)).toBe(true)
  })

  test.each(['/', `${LIST}/${ID}`, LIVE_ANIMALS_URL])(
    'Should be false for %s',
    (value) => {
      expect(landsOnAddressBook(value)).toBe(false)
    }
  )
})

describe('#deadLinkDestination', () => {
  beforeEach(() => {
    config.set('stubMode', false)
  })

  test('Should give an honoured return even for a malformed id', () => {
    expect(
      deadLinkDestination({
        params: { id: 'not-a-valid-id' },
        query: { return: '/' }
      })
    ).toBe('/')
  })

  test('Should give the list when there is no return', () => {
    expect(deadLinkDestination({ params: { id: ID }, query: {} })).toBe(LIST)
  })
})
