import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  SUCCESS_BANNER_DISMISS_MS,
  initAddressBookSuccessBanner
} from './address-book-success-banner.js'

describe('#initAddressBookSuccessBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('hides the success banner after 3 seconds', () => {
    const banner = { hidden: false }
    const document = {
      getElementById: vi.fn(() => banner)
    }

    initAddressBookSuccessBanner(document)

    expect(banner.hidden).toBe(false)

    vi.advanceTimersByTime(SUCCESS_BANNER_DISMISS_MS)

    expect(banner.hidden).toBe(true)
  })

  test('does nothing when the banner element is absent', () => {
    const document = {
      getElementById: vi.fn(() => null)
    }

    initAddressBookSuccessBanner(document)

    expect(vi.getTimerCount()).toBe(0)
  })
})
