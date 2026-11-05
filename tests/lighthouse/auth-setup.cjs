const {
  chooseAddressTypeInBrowser,
  signInForm
} = require('../../scripts/lighthouse/browser-session.js')

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
