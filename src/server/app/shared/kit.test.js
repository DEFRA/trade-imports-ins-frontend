import { describe, expect, it } from 'vitest'

import { statusCodes } from '../../common/constants/status-codes.js'
import { ORGANISATION_ID } from '../../common/test-helpers/session-auth.js'
import {
  base,
  draftJourneyStrip,
  errorSummary,
  pageRoutes,
  requireOrganisationId,
  routeOptions,
  sharedCopy,
  SURFACES
} from './kit.js'

const ENTER_A_NAME = 'Enter a name'
const NOTIFICATION_REFERENCE = 'GBN-AG-26-4F7K2P'
const ADD_PATH = '/address-book/add'
const EDIT_PATH = '/address-book/{id}/edit'

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
      sharedCopy,
      recoverableError: false,
      journeyStrip: null,
      contentColumnClass: SURFACES.form
    })
  })

  it('Should carry a back link and a recoverable error through', () => {
    expect(
      base('Add address and contact details', {
        backLink: '/address-book',
        recoverableError: true
      })
    ).toMatchObject({
      pageTitle: 'Add address and contact details',
      backLink: '/address-book',
      recoverableError: true
    })
  })

  it('Should carry a journey strip through', () => {
    const journeyStrip = draftJourneyStrip(NOTIFICATION_REFERENCE)

    expect(base('Dashboard', { journeyStrip }).journeyStrip).toBe(journeyStrip)
  })
})

describe('#errorSummary', () => {
  it('Should be null when there are no field errors', () => {
    expect(errorSummary()).toBeNull()
    expect(errorSummary({})).toBeNull()
  })

  it('Should list every field error under the one title, each linked to its in-page anchor', () => {
    expect(
      errorSummary({ name: ENTER_A_NAME, email: 'Enter an email address' })
    ).toEqual({
      titleText: 'There is a problem',
      errorList: [
        { text: ENTER_A_NAME, href: '#name' },
        { text: 'Enter an email address', href: '#email' }
      ]
    })
  })

  it('Should link through a supplied href builder and keep the caret where it is when asked', () => {
    const summary = errorSummary(
      { name: ENTER_A_NAME },
      { href: (field) => `${ADD_PATH}#${field}`, disableAutoFocus: true }
    )

    expect(summary.errorList).toEqual([
      { text: ENTER_A_NAME, href: `${ADD_PATH}#name` }
    ])
    expect(summary.disableAutoFocus).toBe(true)
  })
})

describe('#draftJourneyStrip', () => {
  it('Should show the Draft status in a blue tag beside the notification reference', () => {
    expect(draftJourneyStrip(NOTIFICATION_REFERENCE)).toEqual({
      status: { text: 'Draft', classes: 'govuk-tag--blue' },
      reference: NOTIFICATION_REFERENCE
    })
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
    expect(pageRoutes(ADD_PATH, { get, post })).toEqual([
      {
        method: 'GET',
        path: ADD_PATH,
        options: routeOptions,
        handler: get
      },
      {
        method: 'POST',
        path: ADD_PATH,
        options: routeOptions,
        handler: post
      }
    ])
  })

  it('Should apply the route options a page supplies to both routes', () => {
    const options = { ...routeOptions, validate: { params: {} } }

    expect(pageRoutes(EDIT_PATH, { get, post }, options)).toEqual([
      {
        method: 'GET',
        path: EDIT_PATH,
        options,
        handler: get
      },
      {
        method: 'POST',
        path: EDIT_PATH,
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
