import { expect } from '@playwright/test'

import { FIELD_RULES } from '../fields.js'

/**
 * Shared fixture for the address form specs. Add and edit render the same
 * Standard Address Block against the same schema (fields.js), so the
 * labels, the valid payload and both validation tables are common to them.
 */

export const NAME_LABEL = 'Name or organisation name'
const ADDRESS_LINE_1_LABEL = 'Address line 1'
const TOWN_OR_CITY_LABEL = 'Town or city'
const POSTCODE_LABEL = 'Postcode or Zip code'
const PHONE_LABEL = 'Phone number'
const EMAIL_LABEL = 'Email address'

export const fieldLabels = {
  name: NAME_LABEL,
  addressLine1: ADDRESS_LINE_1_LABEL,
  addressLine2: 'Address line 2 (optional)',
  townOrCity: TOWN_OR_CITY_LABEL,
  county: 'County (optional)',
  postcode: POSTCODE_LABEL,
  countryCode: 'Country',
  phone: PHONE_LABEL,
  email: EMAIL_LABEL
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
  ['name', NAME_LABEL, 'Enter a name'],
  ['addressLine1', ADDRESS_LINE_1_LABEL, 'Enter address line 1'],
  ['townOrCity', TOWN_OR_CITY_LABEL, 'Enter a town or city'],
  ['postcode', POSTCODE_LABEL, 'Enter a postcode'],
  ['countryCode', 'Country', 'Enter a country'],
  ['phone', PHONE_LABEL, 'Enter a telephone number'],
  ['email', EMAIL_LABEL, 'Enter an email address']
]

// [field, label, maxLength, "must be N characters or fewer" error] - every
// field with a stated max length, mandatory or not, matching fields.js.
export const maxLengthValidations = [
  [
    'name',
    NAME_LABEL,
    FIELD_RULES.name.maxLength,
    'Name must be 255 characters or fewer'
  ],
  [
    'addressLine1',
    ADDRESS_LINE_1_LABEL,
    FIELD_RULES.addressLine1.maxLength,
    'Address line 1 must be 255 characters or fewer'
  ],
  [
    'addressLine2',
    'Address line 2 (optional)',
    FIELD_RULES.addressLine2.maxLength,
    'Address line 2 must be 255 characters or fewer'
  ],
  [
    'townOrCity',
    TOWN_OR_CITY_LABEL,
    FIELD_RULES.townOrCity.maxLength,
    'Town or city must be 100 characters or fewer'
  ],
  [
    'county',
    'County (optional)',
    FIELD_RULES.county.maxLength,
    'County must be 100 characters or fewer'
  ],
  [
    'postcode',
    POSTCODE_LABEL,
    FIELD_RULES.postcode.maxLength,
    'Postcode must be 12 characters or fewer'
  ],
  [
    'phone',
    PHONE_LABEL,
    FIELD_RULES.phone.maxLength,
    'Telephone number must be 20 characters or fewer'
  ],
  [
    'email',
    EMAIL_LABEL,
    FIELD_RULES.email.maxLength,
    'Email address must be 254 characters or fewer'
  ]
]
