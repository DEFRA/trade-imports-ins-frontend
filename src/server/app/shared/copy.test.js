import { describe, expect, it } from 'vitest'

import { copyFor } from './copy.js'
import { copy as sharedEn } from './copy.en.js'
import { copy as sharedCy } from './copy.cy.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('#copyFor', () => {
  it('Should resolve the requested locale', () => {
    const en = { title: 'Hello' }
    expect(copyFor({ en }, 'en')).toBe(en)
  })

  it('Should default to English when no locale is given', () => {
    const en = { title: 'Hello' }
    expect(copyFor({ en })).toBe(en)
  })

  it('Should fall back to English for an unknown locale', () => {
    const en = { title: 'Hello' }
    expect(copyFor({ en }, 'cy')).toBe(en)
  })
})

describe('unauthorised-page copy', () => {
  it('Should carry the sign-in failure wording the auth controller renders', () => {
    expect(sharedEn.unauthorised).toEqual({
      title: 'Unable to sign in',
      heading: 'Sorry, we are unable to sign you in.',
      bodyPrefix: 'Please',
      signInLinkText: 'try again'
    })
  })

  it('Should carry the same keys in Welsh', () => {
    expect(Object.keys(sharedCy.unauthorised)).toEqual(
      Object.keys(sharedEn.unauthorised)
    )
  })
})

describe('error-page copy', () => {
  it('Should carry one message per status the catch-all names, and the fallback', () => {
    expect(sharedEn.errorPage).toEqual({
      notFound: 'Page not found',
      forbidden: 'Forbidden',
      unauthorized: 'Unauthorized',
      badRequest: 'Bad Request',
      unexpected: 'Something went wrong'
    })
  })
})

describe('shared copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(sharedEn)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })
})
