import { config } from '../../../config/config.js'
import { copyFor } from '../shared/copy.js'
import { copy as copyEn } from './copy/copy.en.js'
import { copy as copyCy } from './copy/copy.cy.js'
import { BANNER_CLASSES, TAG_CLASSES } from './levels.js'
import { PAGE_LEVELS, SECTION_LEVELS } from './page-levels.js'

const copy = copyFor({ en: copyEn, cy: copyCy })

const ERROR_TEMPLATE = 'shared/error'

const isErrorPage = (request) =>
  request.response?.source?.template === ERROR_TEMPLATE

const inSection = (routePath, section) =>
  routePath === section || routePath.startsWith(`${section}/`)

/**
 * Finds the maturity level of a page from its hapi route pattern.
 * An exact entry in `PAGE_LEVELS` wins; otherwise the first matching entry in
 * `SECTION_LEVELS` applies.
 *
 * @param {string | undefined} routePath - the route pattern, e.g. `/address-book/add`
 * @returns {string | undefined} a level id from `LEVELS`, or `undefined` when the page is not listed
 */
export const pageLevelFor = (routePath) => {
  if (!routePath) {
    return undefined
  }
  if (Object.hasOwn(PAGE_LEVELS, routePath)) {
    return PAGE_LEVELS[routePath]
  }
  return SECTION_LEVELS.find(({ section }) => inSection(routePath, section))
    ?.level
}

/**
 * Builds the view context that puts a page's maturity level in the phase banner.
 *
 * @param {{ route?: { path?: string }, response?: { source?: { template?: string } } }} request - the hapi request being rendered
 * @returns {{ pageMaturity?: { classes: string, tag: { text: string, classes: string }, text: string, hiddenPrefix: string } }}
 *   an empty object when the banner is switched off, the page is not listed, or the response is the error page
 */
export const pageMaturityContext = (request) => {
  if (!config.get('pageMaturityBanner.enabled') || isErrorPage(request)) {
    return {}
  }
  const level = pageLevelFor(request.route?.path)
  if (!level) {
    return {}
  }
  return {
    pageMaturity: {
      classes: BANNER_CLASSES[level],
      tag: { text: copy.levels[level].tag, classes: TAG_CLASSES[level] },
      text: copy.levels[level].text,
      hiddenPrefix: copy.hiddenPrefix
    }
  }
}
