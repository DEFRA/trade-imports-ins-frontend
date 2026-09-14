import Boom from '@hapi/boom'

import { organisationIdOf } from '../../common/helpers/organisation-id.js'

export const routeOptions = { auth: 'session' }

export const sharedCopy = {}

const LAYOUT = 'shared/layout.njk'

const ERROR_SUMMARY_TITLE = 'There is a problem'

const anchorHref = (field) => `#${field}`

/**
 * The one error summary shape the service renders.
 *
 * @param {object} [fieldErrors] - map of key to message. Empty means no summary.
 * @param {object} [options]
 * @param {(key: string) => string} [options.href] - builds the link for a key.
 * Defaults to the in-page anchor `#key`; pass a builder when the entries link
 * somewhere else, such as another page.
 * @param {boolean} [options.disableAutoFocus] - keep the caret where it is
 * instead of moving it to the summary. Set it on a page that renders the
 * summary without the user having just been refused.
 * @returns {object|null} the summary view model, or null when there are no
 * errors.
 */
export const errorSummary = (
  fieldErrors,
  { href = anchorHref, disableAutoFocus } = {}
) => {
  const entries = Object.entries(fieldErrors ?? {})
  if (entries.length === 0) {
    return null
  }
  return {
    titleText: ERROR_SUMMARY_TITLE,
    disableAutoFocus,
    errorList: entries.map(([field, text]) => ({ text, href: href(field) }))
  }
}

export const fieldError = (fieldErrors, field) =>
  fieldErrors?.[field] ? { text: fieldErrors[field] } : undefined

/**
 * The chrome every page shares.
 *
 * @param {string} title - the page title.
 * @param {object} [options]
 * @param {string} [options.backLink] - where the back link goes; omit it on a
 * page with no way back.
 * @param {boolean} [options.recoverableError] - the save failed in a way the
 * user can retry.
 * @returns {object} the common view model.
 */
export const base = (title, { backLink, recoverableError = false } = {}) => ({
  layout: LAYOUT,
  pageTitle: title,
  backLink,
  sharedCopy,
  recoverableError
})

export const requireOrganisationId = (request) => {
  const organisationId = organisationIdOf(request)
  if (!organisationId) {
    throw Boom.forbidden('Organisation could not be identified')
  }
  return organisationId
}

/**
 * The routes for one page.
 *
 * @param {string} path - the route path, built by paths.js.
 * @param {object} handlers
 * @param {Function} handlers.get - renders the page.
 * @param {Function} [handlers.post] - handles the page's form; omit it on a
 * page with no form.
 * @param {object} [options] - the Hapi route options for both routes; a page
 * whose path carries a parameter passes its own so the parameter is
 * validated before the handler runs.
 * @returns {object[]} the Hapi routes.
 */
export const pageRoutes = (path, { get, post }, options = routeOptions) => [
  { method: 'GET', path, options, handler: get },
  ...(post ? [{ method: 'POST', path, options, handler: post }] : [])
]
