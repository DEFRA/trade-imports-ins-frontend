import { TimeoutError } from 'puppeteer'

import { appCookiesOf, createPageClient } from './page-client.js'
import { chooseAddressType } from './seed-address.js'

const SIGN_IN_TIMEOUT_MS = 10000

export const waitForSignInForm = async (page) => {
  try {
    return await page.waitForSelector('input[name="crn"]', {
      visible: true,
      timeout: SIGN_IN_TIMEOUT_MS
    })
  } catch (err) {
    if (err instanceof TimeoutError) {
      return null
    }
    throw err
  }
}

export const signInForm = (page, url) => {
  const onIdentityProvider = new URL(page.url()).origin !== new URL(url).origin
  return onIdentityProvider
    ? waitForSignInForm(page)
    : page.$('input[name="crn"]')
}

export const chooseAddressTypeInBrowser = async (browser, url) => {
  const client = createPageClient(url, await appCookiesOf(browser, url))
  await chooseAddressType(client)
  await browser.setCookie(
    ...client.cookies().map(({ name, value }) => ({
      name,
      value,
      domain: new URL(url).hostname
    }))
  )
}
