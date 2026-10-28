import Boom from '@hapi/boom'

import { organisationIdOf } from '../../common/helpers/organisation-id.js'
import { copyFor } from './copy.js'
import { copy as sharedEn } from './copy.en.js'
import { copy as sharedCy } from './copy.cy.js'

export const routeOptions = { auth: 'session' }

export const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

export const SURFACES = Object.freeze({
  form: 'govuk-grid-column-two-thirds',
  display: 'govuk-grid-column-full'
})

export const surfaceClass = (surface) => {
  if (!Object.hasOwn(SURFACES, surface)) {
    throw new Error(
      `Unknown surface '${surface}'. Expected one of: ${Object.keys(SURFACES).join(', ')}`
    )
  }
  return SURFACES[surface]
}

const LAYOUT = 'shared/layout.njk'

const anchorHref = (field) => `#${field}`

export const errorSummary = (
  fieldErrors,
  { href = anchorHref, disableAutoFocus } = {}
) => {
  const entries = Object.entries(fieldErrors ?? {})
  if (entries.length === 0) {
    return null
  }
  return {
    titleText: sharedCopy.errorSummary.title,
    disableAutoFocus,
    errorList: entries.map(([field, text]) => ({ text, href: href(field) }))
  }
}

export const draftJourneyStrip = (reference) => ({
  status: {
    text: sharedCopy.journeyStrip.draft,
    classes: 'govuk-tag--blue'
  },
  reference
})

export const base = (
  title,
  { backLink, recoverableError = false, journeyStrip = null } = {}
) => ({
  layout: LAYOUT,
  pageTitle: title,
  backLink,
  sharedCopy,
  recoverableError,
  journeyStrip,
  contentColumnClass: SURFACES.form
})

export const requireOrganisationId = (request) => {
  const organisationId = organisationIdOf(request)
  if (!organisationId) {
    throw Boom.forbidden('Organisation could not be identified')
  }
  return organisationId
}

export const pageRoutes = (path, { get, post }, options = routeOptions) => [
  { method: 'GET', path, options, handler: get },
  ...(post ? [{ method: 'POST', path, options, handler: post }] : [])
]
