const SIGN_IN_TIMEOUT_MS = 10000

const signInForm = (page, url) => {
  const onIdentityProvider = new URL(page.url()).origin !== new URL(url).origin
  if (!onIdentityProvider) {
    return page.$('input[name="crn"]')
  }
  return page
    .waitForSelector('input[name="crn"]', {
      visible: true,
      timeout: SIGN_IN_TIMEOUT_MS
    })
    .catch(() => null)
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

  // The address form redirects to the type step until a type is chosen.
  await page.goto(new URL('/address-book/add/address-type', url).toString(), {
    waitUntil: 'domcontentloaded'
  })
  await page.click('input[name="addressType"]')
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click('form button[type="submit"], form .govuk-button')
  ])

  await page.close()
}
