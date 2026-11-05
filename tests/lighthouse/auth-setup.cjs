const { TimeoutError } = require('puppeteer')

const {
  appCookiesOf,
  createPageClient
} = require('../../scripts/lighthouse/page-client.js')
const {
  chooseAddressType
} = require('../../scripts/lighthouse/seed-address.js')

const SIGN_IN_TIMEOUT_MS = 10000

const waitForSignInForm = async (page) => {
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

const signInForm = (page, url) => {
  const onIdentityProvider = new URL(page.url()).origin !== new URL(url).origin
  return onIdentityProvider
    ? waitForSignInForm(page)
    : page.$('input[name="crn"]')
}

const chooseAddressTypeInBrowser = async (browser, url) => {
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

const signInAndChooseAddressType = async (browser, { url }) => {
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })

  if (await signInForm(page, url)) {
    await page.type('input[name="crn"]', '2100010101')
    await page.type(
      'input[name="password"]',
      process.env.AUTH_PASSWORD || 'Password123'
    )
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('#submit')
    ])
  }

  await chooseAddressTypeInBrowser(browser, url)

  await page.close()
}

module.exports = signInAndChooseAddressType
module.exports.chooseAddressTypeInBrowser = chooseAddressTypeInBrowser
module.exports.waitForSignInForm = waitForSignInForm
