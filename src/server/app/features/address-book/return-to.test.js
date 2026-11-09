import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  addressBookPath,
  ADDRESS_ID,
  addressPath,
  addressDeletePath,
  addressEditPath,
  MALFORMED_ADDRESS_ID
} from '../../../common/test-helpers/address-book-requests.js'
import {
  deadLinkDestination,
  editLeaveDestinationOf,
  landsOnAddressBook,
  honouredReturnOf,
  returnDestinationOf,
  pathWithReturn
} from './return-to.js'

const OTHER_ADDRESS_ID = '111111111111111111111111'
const ANIMALS_FRONTEND_ORIGIN = new URL(
  config.get('tradeImportsAnimalsFrontend.baseUrl')
).origin
const PLANTS_FRONTEND_ORIGIN = new URL(
  config.get('tradeImportsPlantsFrontend.baseUrl')
).origin
const LIVE_ANIMALS_URL = `${ANIMALS_FRONTEND_ORIGIN}/live-animals/notifications/abc`
const GERMINAL_URL = `${ANIMALS_FRONTEND_ORIGIN}/germinal-products/notifications`
const LIVE_ANIMALS_PICKER_PATH =
  '/live-animals/notifications/abc/consignors/select?q=farm&page=2&change=1'

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

  test('Should ignore an animals frontend URL in stub mode but still honour a page of this service', () => {
    config.set('stubMode', true)

    expect(honouredReturnOf(requestWithReturn(LIVE_ANIMALS_URL))).toBeNull()
    expect(honouredReturnOf(requestWithReturn('/'))).toBe('/')
  })

  test.each([LIVE_ANIMALS_PICKER_PATH, '/live-animals'])(
    'Should honour the live-animals path %s as that page on the animals frontend outside stub mode',
    (liveAnimalsPath) => {
      expect(honouredReturnOf(requestWithReturn(liveAnimalsPath))).toBe(
        `${ANIMALS_FRONTEND_ORIGIN}${liveAnimalsPath}`
      )
    }
  )

  test('Should ignore a live-animals path in stub mode rather than treat it as a page of this service', () => {
    config.set('stubMode', true)

    expect(
      honouredReturnOf(requestWithReturn(LIVE_ANIMALS_PICKER_PATH))
    ).toBeNull()
  })

  test('Should honour a path that only starts with the live-animals letters as a page of this service', () => {
    expect(honouredReturnOf(requestWithReturn('/live-animalsx/y'))).toBe(
      '/live-animalsx/y'
    )
  })
})

describe('#pathWithReturn', () => {
  const path = `${addressBookPath()}/x`

  test.each([null, addressBookPath()])(
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
    expect(returnDestinationOf(ADDRESS_ID, addressPath(OTHER_ADDRESS_ID))).toBe(
      addressPath(OTHER_ADDRESS_ID)
    )
  })

  test.each([
    ['no return', null],
    ['its view page', addressPath(ADDRESS_ID)],
    ['its edit page', addressEditPath(ADDRESS_ID)],
    ['its delete page with a query', `${addressDeletePath(ADDRESS_ID)}?x=1`]
  ])('Should give the address book for %s', (_name, honouredReturn) => {
    expect(returnDestinationOf(ADDRESS_ID, honouredReturn)).toBe(
      addressBookPath()
    )
  })

  test('Should give an animals frontend URL unchanged', () => {
    expect(returnDestinationOf(ADDRESS_ID, LIVE_ANIMALS_URL)).toBe(
      LIVE_ANIMALS_URL
    )
  })
})

describe('#editLeaveDestinationOf', () => {
  test('Should give the address’s view page when there is no return', () => {
    expect(editLeaveDestinationOf(ADDRESS_ID, null)).toBe(
      addressPath(ADDRESS_ID)
    )
  })

  test.each([
    ['a page of this service', '/'],
    ['an animals frontend URL', LIVE_ANIMALS_URL],
    ['the address’s own view page', addressPath(ADDRESS_ID)]
  ])('Should give %s unchanged', (_name, honouredReturn) => {
    expect(editLeaveDestinationOf(ADDRESS_ID, honouredReturn)).toBe(
      honouredReturn
    )
  })
})

describe('#landsOnAddressBook', () => {
  test.each([addressBookPath(), `${addressBookPath()}?search=x`])(
    'Should be true for %s',
    (path) => {
      expect(landsOnAddressBook(path)).toBe(true)
    }
  )

  test.each(['/', addressPath(ADDRESS_ID), LIVE_ANIMALS_URL])(
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
        params: { id: MALFORMED_ADDRESS_ID },
        query: { return: '/' }
      })
    ).toBe('/')
  })

  test('Should give the address book when there is no return', () => {
    expect(deadLinkDestination({ params: { id: ADDRESS_ID }, query: {} })).toBe(
      addressBookPath()
    )
  })
})
