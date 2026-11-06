import {
  getDefaultAutoSelectFamilyAttemptTimeout,
  setDefaultAutoSelectFamilyAttemptTimeout
} from 'node:net'

import { afterEach, describe, expect, test } from 'vitest'

import { allowOneSecondPerAddressWhenConnecting } from './connect-attempt.js'

describe('#allowOneSecondPerAddressWhenConnecting', () => {
  const nodeDefault = getDefaultAutoSelectFamilyAttemptTimeout()

  afterEach(() => {
    setDefaultAutoSelectFamilyAttemptTimeout(nodeDefault)
  })

  test('gives each address of a host one second to connect before trying the next', () => {
    allowOneSecondPerAddressWhenConnecting()

    expect(getDefaultAutoSelectFamilyAttemptTimeout()).toBe(1000)
  })
})
