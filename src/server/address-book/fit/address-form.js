import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

/**
 * Shared fixture for the address form specs. Add and edit render the same
 * Standard Address Block against the same schema (address-schema.js), so the
 * labels, the valid payload and both validation tables are common to them.
 */

export const NAME_LABEL = 'Name or organisation name'

export const fieldLabels = {
  name: NAME_LABEL,
  addressLine1: 'Address line 1',
  addressLine2: 'Address line 2 (optional)',
  townOrCity: 'Town or city',
  county: 'County (optional)',
  postcode: 'Postcode or Zip code',
  countryCode: 'Country',
  phone: 'Phone number',
  email: 'Email address'
}

export const validAddress = {
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

/**
 * Signs in via the stub-auth route (see server/auth/stub-sign-in.js) - no
 * real Defra ID stub involved, only reachable when AUTH_STUB_MODE=true.
 */
export async function signIn(page, { organisationId = 'stub-org-1' } = {}) {
  await page.goto(
    `/auth/stub-sign-in?organisationId=${encodeURIComponent(organisationId)}`
  )
}

export async function expectNoSeriousOrCriticalAxeViolations(page, pageName) {
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

export async function setFieldValue(page, field, value) {
  const control = page.getByLabel(fieldLabels[field])
  if (field === 'countryCode') {
    await control.selectOption(value)
  } else {
    await control.fill(value)
  }
}

export async function fillValidAddress(page, overrides = {}) {
  const values = { ...validAddress, ...overrides }
  for (const [field, value] of Object.entries(values)) {
    await setFieldValue(page, field, value)
  }
}

export const errorLink = (page, message) =>
  page.getByRole('alert').getByRole('link', { name: message })

/**
 * Follows an error-summary link and asserts the GDS error pattern held - the
 * form stayed put, focus moved to the offending field, and what was typed
 * survived the round trip.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} options
 * @param {string} options.message - Error text, as it appears in the summary
 * @param {string} options.label - Label of the field the summary links to
 * @param {string} options.expectedValue - Value that field should still hold
 * @param {RegExp} options.url - URL the form should have stayed on
 */
export async function expectErrorFocusOn(
  page,
  { message, label, expectedValue, url }
) {
  await expect(page).toHaveURL(url)
  const link = errorLink(page, message)
  await expect(link).toBeVisible()
  await link.click()
  const control = page.getByLabel(label)
  await expect(control).toBeFocused()
  await expect(control).toHaveValue(expectedValue)
}

// [field, label, "enter a ..." error]. Address Line 2 and County are optional
// - deliberately excluded.
export const requiredValidations = [
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
export const maxLengthValidations = [
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
