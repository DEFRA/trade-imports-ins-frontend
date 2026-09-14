import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from './copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const renderLayout = (context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Dashboard',
    serviceName: 'trade-imports-ins-frontend',
    sharedCopy,
    userSession: { isAuthenticated: false },
    breadcrumbs: [],
    navigation: [],
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

describe('footer', () => {
  it('Should label the three meta links from the shared copy', () => {
    const $ = load(renderLayout())
    const links = $('.govuk-footer__inline-list-item a')

    expect(links.map((_, anchor) => $(anchor).text().trim()).get()).toEqual([
      sharedCopy.layout.footer.privacy,
      sharedCopy.layout.footer.cookies,
      sharedCopy.layout.footer.accessibility
    ])
  })
})

describe('page title', () => {
  it('Should keep the convict service name after the page title', () => {
    const $ = load(renderLayout())

    expect($('head > title').text().trim()).toBe(
      'Dashboard | trade-imports-ins-frontend'
    )
  })
})
