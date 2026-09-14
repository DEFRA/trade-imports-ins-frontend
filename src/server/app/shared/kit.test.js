import { describe, expect, it } from 'vitest'

import { statusCodes } from '../../common/constants/status-codes.js'
import {
  base,
  errorSummary,
  fieldError,
  pageRoutes,
  requireOrganisationId,
  routeOptions,
  sharedCopy,
  SURFACES
} from './kit.js'

const ORGANISATION_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'

const thrownBy = (callback) => {
  try {
    callback()
  } catch (error) {
    return error
  }
}

describe('#base — the chrome every page shares', () => {
  it('Should name the layout, carry the title and default the rest', () => {
    expect(base('Dashboard')).toEqual({
      layout: 'shared/layout.njk',
      pageTitle: 'Dashboard',
      backLink: undefined,
      sharedCopy,
      recoverableError: false,
      contentColumnClass: SURFACES.form
    })
  })

  it('Should carry a back link and a recoverable error through', () => {
    expect(
      base('Add address details', {
        backLink: '/address-book',
        recoverableError: true
      })
    ).toMatchObject({
      pageTitle: 'Add address details',
      backLink: '/address-book',
      recoverableError: true
    })
  })
})

describe('#errorSummary', () => {
  it('Should be null when there are no field errors', () => {
    expect(errorSummary()).toBeNull()
    expect(errorSummary({})).toBeNull()
  })

  it('Should list every field error under the one title, each linked to its in-page anchor', () => {
    expect(
      errorSummary({ name: 'Enter a name', email: 'Enter an email address' })
    ).toEqual({
      titleText: 'There is a problem',
      disableAutoFocus: undefined,
      errorList: [
        { text: 'Enter a name', href: '#name' },
        { text: 'Enter an email address', href: '#email' }
      ]
    })
  })

  it('Should link through a supplied href builder and keep the caret where it is when asked', () => {
    const summary = errorSummary(
      { name: 'Enter a name' },
      { href: (field) => `/address-book/add#${field}`, disableAutoFocus: true }
    )

    expect(summary.errorList).toEqual([
      { text: 'Enter a name', href: '/address-book/add#name' }
    ])
    expect(summary.disableAutoFocus).toBe(true)
  })
})

describe('#fieldError', () => {
  it('Should wrap the field message for the govuk macro', () => {
    expect(fieldError({ name: 'Enter a name' }, 'name')).toEqual({
      text: 'Enter a name'
    })
  })

  it('Should be undefined when the field has no error', () => {
    expect(fieldError({ name: 'Enter a name' }, 'email')).toBeUndefined()
    expect(fieldError(undefined, 'email')).toBeUndefined()
  })
})

describe('#pageRoutes', () => {
  const get = () => 'page'
  const post = () => 'saved'

  it('Should register a GET alone for a page with no form', () => {
    expect(pageRoutes('/', { get })).toEqual([
      { method: 'GET', path: '/', options: routeOptions, handler: get }
    ])
  })

  it('Should register the GET and POST pair on the same path for a page with a form', () => {
    expect(pageRoutes('/address-book/add', { get, post })).toEqual([
      {
        method: 'GET',
        path: '/address-book/add',
        options: routeOptions,
        handler: get
      },
      {
        method: 'POST',
        path: '/address-book/add',
        options: routeOptions,
        handler: post
      }
    ])
  })

  it('Should apply the route options a page supplies to both routes', () => {
    const options = { ...routeOptions, validate: { params: {} } }

    expect(
      pageRoutes('/address-book/{id}/edit', { get, post }, options)
    ).toEqual([
      {
        method: 'GET',
        path: '/address-book/{id}/edit',
        options,
        handler: get
      },
      {
        method: 'POST',
        path: '/address-book/{id}/edit',
        options,
        handler: post
      }
    ])
  })

  it('Should name the session strategy on every route', () => {
    expect(routeOptions).toEqual({ auth: 'session' })
  })
})

describe('#requireOrganisationId', () => {
  it('Should return the organisation from the verified session', () => {
    expect(
      requireOrganisationId({
        auth: { credentials: { organisationId: ORGANISATION_ID } }
      })
    ).toBe(ORGANISATION_ID)
  })

  it('Should refuse a session that carries no organisation with a 403', () => {
    const error = thrownBy(() =>
      requireOrganisationId({ auth: { credentials: {} } })
    )

    expect(error.isBoom).toBe(true)
    expect(error.output.statusCode).toBe(statusCodes.forbidden)
    expect(error.message).toBe('Organisation could not be identified')
  })
})
