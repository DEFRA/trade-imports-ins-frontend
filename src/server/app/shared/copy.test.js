import { describe, expect, it } from 'vitest'

import { copyFor } from './copy.js'
import {
  copy as sharedEn,
  validatorDefaults as validatorDefaultsEn
} from './copy.en.js'
import {
  copy as sharedCy,
  validatorDefaults as validatorDefaultsCy
} from './copy.cy.js'

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

describe('layout copy', () => {
  it('Should name the service and the four navigation items the fit specs click', () => {
    expect(sharedEn.layout.serviceName).toBe('Import notification service')
    expect(sharedEn.layout.serviceNavigation).toEqual({
      menuButton: 'Menu',
      dashboard: 'Dashboard',
      addressBook: 'Address book',
      manageAccount: 'Manage account',
      logOut: 'Log out'
    })
  })

  it('Should tell the user to try again when a service behind a page fails', () => {
    expect(sharedEn.recoverableError).toEqual({
      title: 'There is a problem',
      body: 'Sorry, there is a problem with the service. Try again in a few minutes.'
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

describe('validator defaults', () => {
  const SAMPLE_ARGUMENTS = [1, 2]

  const textOf = (value) =>
    typeof value === 'function' ? value(...SAMPLE_ARGUMENTS) : value

  it.each([
    ['en', validatorDefaultsEn],
    ['cy', validatorDefaultsCy]
  ])(
    'Should render text at every %s leaf, function leaves included',
    (locale, defaults) => {
      for (const { path, value } of leaves(defaults)) {
        expect(
          textOf(value).trim().length,
          `${locale}: ${path} must render text`
        ).toBeGreaterThan(0)
      }
    }
  )
})
