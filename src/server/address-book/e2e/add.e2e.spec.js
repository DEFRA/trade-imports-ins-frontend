import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

const NAME_FIELD = '#name'

/**
 * Signs in via the stub-auth route (see server/auth/stub-sign-in.js) - no
 * real Defra ID stub involved, only reachable when AUTH_STUB_MODE=true.
 */
async function signIn(page, { organisationId = 'stub-org-1' } = {}) {
  await page.goto(
    `/auth/stub-sign-in?organisationId=${encodeURIComponent(organisationId)}`
  )
}

async function expectNoSeriousOrCriticalAxeViolations(page, pageName) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )
  expect(
    seriousOrCritical,
    `${pageName} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

const validAddress = {
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  addressLine2: 'Unit 3',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  email: 'exports@example.com',
  phone: '+44 1463 234567'
}

async function setFieldValue(page, field, value) {
  const control = page.locator(`#${field}`)
  if (field === 'countryCode') {
    await control.selectOption(value)
  } else {
    await control.fill(value)
  }
}

async function fillValidAddress(page, overrides = {}) {
  const values = { ...validAddress, ...overrides }
  for (const [field, value] of Object.entries(values)) {
    await setFieldValue(page, field, value)
  }
}

const errorLink = (page, message) =>
  page.getByRole('alert').getByRole('link', { name: message })

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

async function expectErrorFocusOn(page, message, field, expectedValue) {
  await expect(page).toHaveURL(/\/address-book\/add$/)
  const link = errorLink(page, message)
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.locator(`#${field}`)).toBeFocused()
  await expect(page.locator(`#${field}`)).toHaveValue(expectedValue)
}

// [field, label, "enter a ..." error]. Address Line 2 and County are optional
// - deliberately excluded.
const requiredValidations = [
  ['name', 'Name or organisation name', 'Enter a name'],
  ['addressLine1', 'Address line 1', 'Enter address line 1'],
  ['townOrCity', 'Town or city', 'Enter a town or city'],
  ['postcode', 'Postcode or Zip code', 'Enter a postcode'],
  ['countryCode', 'Country', 'Enter a country'],
  ['phone', 'Phone number', 'Enter a telephone number'],
  ['email', 'Email address', 'Enter an email address']
]

// [field, label, maxLength, "must be N characters or fewer" error] - every
// field with a stated max length, mandatory or not, matching address-schema.js.
const maxLengthValidations = [
  [
    'name',
    'Name or organisation name',
    255,
    'Name must be 255 characters or fewer'
  ],
  [
    'addressLine1',
    'Address line 1',
    255,
    'Address line 1 must be 255 characters or fewer'
  ],
  [
    'addressLine2',
    'Address line 2 (optional)',
    255,
    'Address line 2 must be 255 characters or fewer'
  ],
  [
    'townOrCity',
    'Town or city',
    100,
    'Town or city must be 100 characters or fewer'
  ],
  [
    'county',
    'County (optional)',
    100,
    'County must be 100 characters or fewer'
  ],
  [
    'postcode',
    'Postcode or Zip code',
    12,
    'Postcode must be 12 characters or fewer'
  ],
  [
    'phone',
    'Phone number',
    20,
    'Telephone number must be 20 characters or fewer'
  ],
  [
    'email',
    'Email address',
    254,
    'Email address must be 254 characters or fewer'
  ]
]

test.describe('add address', () => {
  test('renders every field, hints and populated country options', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-add-render' })
    await page.goto('/address-book/add')

    await expect(
      page.getByRole('heading', { name: 'Add address details' })
    ).toBeVisible()
    for (const [, label] of [
      ...requiredValidations,
      ['addressLine2', 'Address line 2 (optional)'],
      ['county', 'County (optional)']
    ]) {
      await expect(page.getByLabel(label)).toBeVisible()
    }
    await expect(
      page.getByText('For international numbers include the country code')
    ).toBeVisible()

    const country = page.getByLabel('Country')
    await expect(country).toHaveValue('')
    await expect(
      country.getByRole('option', { name: 'United Kingdom' })
    ).toHaveCount(1)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-axe' })
    await page.goto('/address-book/add')

    await expectNoSeriousOrCriticalAxeViolations(page, 'Add address')
  })
})

test.describe('add address validation', () => {
  for (const [field, label, error] of requiredValidations) {
    test(`empty ${label} links to and focuses the preserved field`, async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-add-required' })
      await page.goto('/address-book/add')

      await fillValidAddress(page, { [field]: '' })
      await submit(page)

      await expectErrorFocusOn(page, error, field, '')
      await expect(page.locator(NAME_FIELD)).toHaveValue(
        field === 'name' ? '' : validAddress.name
      )
    })
  }

  for (const [field, label, maxLength, error] of maxLengthValidations) {
    test(`${label} over ${maxLength} characters links to and focuses the preserved value`, async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-add-maxlength' })
      await page.goto('/address-book/add')

      const value = 'A'.repeat(maxLength + 1)
      await fillValidAddress(page, { [field]: value })
      await submit(page)

      await expectErrorFocusOn(page, error, field, value)
      await expect(page.locator(NAME_FIELD)).toHaveValue(
        field === 'name' ? value : validAddress.name
      )
    })
  }

  test('rejects a malformed email address', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-email' })
    await page.goto('/address-book/add')

    await fillValidAddress(page, { email: 'not-an-email' })
    await submit(page)

    await expectErrorFocusOn(
      page,
      'Enter an email address in the correct format',
      'email',
      'not-an-email'
    )
  })

  test('validation error page has no serious or critical axe violations', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-add-validation-axe' })
    await page.goto('/address-book/add')

    await fillValidAddress(page, { name: '' })
    await submit(page)
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalAxeViolations(
      page,
      'Add address validation error'
    )
  })
})

test.describe('save and confirm', () => {
  test('saves a valid address, shows a confirmation banner and lists the new address', async ({
    page
  }) => {
    await signIn(page, {
      organisationId: `stub-org-add-save-${crypto.randomUUID()}`
    })
    await page.goto('/address-book/add')

    await fillValidAddress(page)
    await submit(page)

    await expect(page).toHaveURL(/\/address-book$/)
    const banner = page.getByText(
      'Highland Livestock Ltd added to your address book'
    )
    await expect(banner).toBeVisible()
    await expect(
      page
        .getByRole('table')
        .getByRole('cell', { name: 'Highland Livestock Ltd', exact: true })
    ).toBeVisible()
  })
})

test.describe('cancel', () => {
  test('returns to the address book without creating an address', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-add-cancel' })
    await page.goto('/address-book/add')

    await page
      .getByLabel('Name or organisation name')
      .fill('Should not be saved')

    await page
      .getByRole('button', { name: 'Cancel and return to address book' })
      .click()

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(page.getByText('Should not be saved')).toHaveCount(0)
  })
})
