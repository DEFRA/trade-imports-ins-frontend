const { TimeoutError } = require('puppeteer')

const { addressTypePath } = require('../../src/server/app/shared/paths.js')

const SIGN_IN_TIMEOUT_MS = 10000
const FIRST_ADDRESS_TYPE = '#addressType'
const CONTINUE_BUTTON = 'form button'

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

const chooseAddressType = async (page, url) => {
  await page.goto(new URL(addressTypePath(), url).toString(), {
    waitUntil: 'domcontentloaded'
  })
  await page.click(FIRST_ADDRESS_TYPE)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click(CONTINUE_BUTTON)
  ])
}

module.exports = async (browser, { url }) => {
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

  await chooseAddressType(page, url)

  await page.close()
}
