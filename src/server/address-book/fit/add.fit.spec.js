import { test, expect } from '@playwright/test'

import {
  NAME_LABEL,
  expectErrorFocusOn,
  expectNoSeriousOrCriticalAxeViolations,
  fieldLabels,
  fillValidAddress,
  maxLengthValidations,
  requiredValidations,
  signIn,
  validAddress
} from './address-form.js'

const ADD_URL = /\/address-book\/add$/

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

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

      await expectErrorFocusOn(page, {
        message: error,
        label,
        expectedValue: '',
        url: ADD_URL
      })
      await expect(page.getByLabel(NAME_LABEL)).toHaveValue(
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

      await expectErrorFocusOn(page, {
        message: error,
        label,
        expectedValue: value,
        url: ADD_URL
      })
      await expect(page.getByLabel(NAME_LABEL)).toHaveValue(
        field === 'name' ? value : validAddress.name
      )
    })
  }

  test('rejects a malformed email address', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-email' })
    await page.goto('/address-book/add')

    await fillValidAddress(page, { email: 'not-an-email' })
    await submit(page)

    await expectErrorFocusOn(page, {
      message: 'Enter an email address in the correct format',
      label: fieldLabels.email,
      expectedValue: 'not-an-email',
      url: ADD_URL
    })
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

    await page.getByLabel(NAME_LABEL).fill('Should not be saved')

    await page
      .getByRole('button', { name: 'Cancel and return to address book' })
      .click()

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(page.getByText('Should not be saved')).toHaveCount(0)
  })
})
