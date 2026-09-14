import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { base, SURFACES, surfaceClass } from './kit.js'
import { copy as sharedCopy } from './copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const PHASE_BANNER = 'govuk-phase-banner'
const BREADCRUMBS = 'govuk-breadcrumbs'
const BACK_LINK = 'govuk-back-link'
const NAVIGATION_LIST = 'govuk-service-navigation__list'
const ACTIVE_ITEM = 'govuk-service-navigation__item--active'
const ACTIVE_FALLBACK = 'govuk-service-navigation__active-fallback'
const NOTIFICATION_BANNER = 'govuk-notification-banner'
const { serviceNavigation } = sharedCopy.layout

const signedIn = {
  isAuthenticated: true,
  displayName: 'Sam Example',
  email: 'sam@example.test'
}
const signedOut = { isAuthenticated: false }

const renderLayout = (userSession, context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Dashboard',
    sharedCopy,
    userSession,
    dashboardUrl: '/',
    addressBookUrl: '/address-book',
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

const pageTitleOf = (html) => load(html)('head > title').text()

describe('service navigation', () => {
  it('Should offer the four Design release 1 items on a signed-in page', () => {
    const $ = load(renderLayout(signedIn))
    const items = $('.govuk-service-navigation__item')
    const links = items.find('a')

    expect(items).toHaveLength(4)
    expect(links.map((_, anchor) => $(anchor).text().trim()).get()).toEqual([
      serviceNavigation.dashboard,
      serviceNavigation.addressBook,
      serviceNavigation.manageAccount,
      serviceNavigation.logOut
    ])
    expect(links.map((_, anchor) => $(anchor).attr('href')).get()).toEqual([
      '/',
      '/address-book',
      '#',
      '/signout'
    ])
  })

  it('Should mark the dashboard item active on the dashboard', () => {
    const $ = load(
      renderLayout(signedIn, { activeNavigationItem: 'dashboard' })
    )

    expect($(`.${ACTIVE_ITEM}`)).toHaveLength(1)
    expect($('[aria-current="true"]')).toHaveLength(1)
    expect($(`.${ACTIVE_FALLBACK}`).text()).toBe(serviceNavigation.dashboard)
  })

  it('Should mark the address book item active inside the address book section', () => {
    const $ = load(
      renderLayout(signedIn, { activeNavigationItem: 'addressBook' })
    )

    expect($(`.${ACTIVE_ITEM}`)).toHaveLength(1)
    expect($(`.${ACTIVE_FALLBACK}`).text()).toBe(serviceNavigation.addressBook)
  })

  it('Should mark nothing active outside any navigation section', () => {
    const html = renderLayout(signedIn, { activeNavigationItem: null })

    expect(html).toContain(NAVIGATION_LIST)
    expect(html).not.toContain(ACTIVE_ITEM)
    expect(html).not.toContain('aria-current')
  })

  it('Should not show the signed-in user anywhere, as Design release 1 does not', () => {
    const html = renderLayout(signedIn)

    expect(html).not.toContain('Sam Example')
    expect(html).not.toContain('sam@example.test')
    expect(html).not.toContain('app-service-header')
  })

  it('Should carry the service name and no items when there is no user', () => {
    const html = renderLayout(signedOut)

    expect(html).toContain(sharedCopy.layout.serviceName)
    expect(html).not.toContain(NAVIGATION_LIST)
    expect(html).not.toContain('href="/signout"')
    expect(html).not.toContain(serviceNavigation.logOut)
  })
})

describe('alpha phase banner', () => {
  const feedbackAnchor =
    '<a class="govuk-link" href="mailto:APHAServiceDesk@apha.gov.uk">give your feedback by email</a>'

  it('Should tag the service as alpha in grey and offer the feedback link', () => {
    const html = renderLayout(signedIn)

    expect(html).toContain(PHASE_BANNER)
    expect(html).toContain('govuk-tag--grey')
    expect(html).toContain('Alpha')
    expect(html).toContain(
      `This is a new service. Help us improve it and ${feedbackAnchor}.`
    )
  })

  it('Should render the banner on a signed-out page too', () => {
    expect(renderLayout(signedOut)).toContain(PHASE_BANNER)
  })

  it('Should place the banner above the back link', () => {
    const html = renderLayout(signedIn, { backLink: '/address-book' })

    expect(html.indexOf(PHASE_BANNER)).toBeLessThan(html.indexOf(BACK_LINK))
  })
})

describe('back link', () => {
  it('Should render the back link the view model names, labelled from the shared copy', () => {
    const $ = load(renderLayout(signedIn, { backLink: '/address-book' }))
    const link = $(`a.${BACK_LINK}`)

    expect(link).toHaveLength(1)
    expect(link.text().trim()).toBe(sharedCopy.layout.back)
    expect(link.attr('href')).toBe('/address-book')
  })

  it('Should render no back link on a page with no way back', () => {
    expect(renderLayout(signedIn)).not.toContain(BACK_LINK)
  })
})

describe('breadcrumbs', () => {
  it('Should render no breadcrumb trail, as Design release 1 has none', () => {
    const html = renderLayout(signedIn, { backLink: '/address-book' })

    expect(html).not.toContain(BREADCRUMBS)
  })

  it('Should ignore a breadcrumbs value a caller still passes', () => {
    const html = renderLayout(signedIn, {
      breadcrumbs: [{ text: 'Your addresses', href: '/address-book' }]
    })

    expect(html).not.toContain(BREADCRUMBS)
    expect(html).not.toContain('Your addresses')
  })
})

describe('recoverable error banner', () => {
  it('Should tell the user to try again when a service behind the page failed', () => {
    const $ = load(renderLayout(signedIn, { recoverableError: true }))
    const banner = $(`.${NOTIFICATION_BANNER}`)

    expect(banner).toHaveLength(1)
    expect(banner.attr('role')).toBe('alert')
    expect(banner.text()).toContain(sharedCopy.recoverableError.title)
    expect(banner.text()).toContain(sharedCopy.recoverableError.body)
  })

  it('Should render no banner otherwise', () => {
    expect(renderLayout(signedIn, { recoverableError: false })).not.toContain(
      NOTIFICATION_BANNER
    )
  })
})

describe('page title', () => {
  it('Should follow the page title with the service name', () => {
    expect(pageTitleOf(renderLayout(signedIn))).toBe(
      'Dashboard | Import notification service'
    )
  })

  it('Should prefix the title when the page carries an error summary', () => {
    expect(
      pageTitleOf(renderLayout(signedIn, { errorSummary: { errorList: [] } }))
    ).toBe('Error: Dashboard | Import notification service')
  })
})

describe('content column width by surface', () => {
  it('Should render a display surface at full container width', () => {
    const html = renderLayout(signedIn, {
      contentColumnClass: SURFACES.display
    })

    expect(html).toContain(SURFACES.display)
    expect(html).not.toContain(SURFACES.form)
  })

  it('Should fall back to the reading measure when no surface is declared', () => {
    const html = renderLayout(signedIn)

    expect(html).toContain(SURFACES.form)
    expect(html).not.toContain('class=""')
  })
})

describe('kit surfaces', () => {
  it('Should build page chrome at the reading measure', () => {
    expect(base('Any page').contentColumnClass).toBe(SURFACES.form)
  })

  it('Should give display pages the full container', () => {
    expect(surfaceClass('display')).toBe(SURFACES.display)
  })

  it('Should reject an unknown surface rather than render nothing', () => {
    expect(() => surfaceClass('widescreen')).toThrow(
      /Unknown surface 'widescreen'/
    )
  })

  it('Should reject an inherited Object property as a surface name', () => {
    expect(() => surfaceClass('constructor')).toThrow(
      /Unknown surface 'constructor'/
    )
  })
})

describe('footer', () => {
  it('Should label the three meta links from the shared copy', () => {
    const $ = load(renderLayout(signedIn))
    const links = $('.govuk-footer__inline-list-item a')

    expect(links.map((_, anchor) => $(anchor).text().trim()).get()).toEqual([
      sharedCopy.layout.footer.privacy,
      sharedCopy.layout.footer.cookies,
      sharedCopy.layout.footer.accessibility
    ])
  })
})
