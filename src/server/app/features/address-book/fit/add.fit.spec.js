import { test, expect } from '@playwright/test'

import {
  NAME_LABEL,
  expectErrorFocusOn,
  fieldLabels,
  fillValidAddress,
  maxLengthValidations,
  requiredValidations,
  validAddress
} from './address-form.js'
import {
  resultsLineOf,
  searchAndExpectSingleMatch
} from './address-book-list.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { SEED_ADDRESS_NAME } from './seed-address.js'
import { signIn } from '../../../../../../fit/sign-in.js'

const ADD_URL = /\/address-book\/add$/
const ADD_PATH = '/address-book/add'

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

test.describe('add address', () => {
  test('renders every field, hints and populated country options', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-add-render' })
    await page.goto(ADD_PATH)

    await expect(
      page.getByRole('heading', { name: 'Add address details' })
    ).toBeVisible()
    await expect(page.getByLabel(NAME_LABEL, { exact: true })).toBeVisible()
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
    await expect(country.getByRole('option').first()).toHaveText(
      'Select a country'
    )
    await expect(
      country.getByRole('option', { name: 'United Kingdom' })
    ).toHaveCount(1)
  })

  test('has a Back link to the address book', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-back' })
    await page.goto(ADD_PATH)

    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', '/address-book')
  })

  test('groups fields under Address and Contact details', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-sections' })
    await page.goto(ADD_PATH)

    for (const name of ['Address', 'Contact details']) {
      await expect(
        page.getByRole('heading', { level: 2, name, exact: true })
      ).toBeVisible()
    }
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-axe' })
    await page.goto(ADD_PATH)

    await expectNoSeriousOrCriticalViolations(page, 'Add address')
  })
})

test.describe('add address validation', () => {
  for (const [field, label, error] of requiredValidations) {
    test(`empty ${label} links to and focuses the preserved field`, async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-add-required' })
      await page.goto(ADD_PATH)

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
      await page.goto(ADD_PATH)

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
    await page.goto(ADD_PATH)

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
    await page.goto(ADD_PATH)

    await fillValidAddress(page, { name: '' })
    await submit(page)
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Add address validation error'
    )
  })
})

test.describe('save and confirm', () => {
  const saveValidAddress = async (page, overrides = {}) => {
    await signIn(page, {
      organisationId: `stub-org-add-save-${crypto.randomUUID()}`
    })
    await page.goto(ADD_PATH)

    await fillValidAddress(page, overrides)
    await submit(page)

    await expect(page).toHaveURL(/\/address-book$/)
  }

  test('saves a valid address and keeps the Success banner naming it showing 10 seconds after the list loads', async ({
    page
  }) => {
    await page.clock.install()
    await saveValidAddress(page)

    const banner = page
      .getByRole('alert', { name: 'Success' })
      .getByText(`${validAddress.name} address added to your address book`, {
        exact: true
      })
    await expect(banner).toBeVisible()
    await page.clock.runFor(10_000)
    await expect(banner).toBeVisible()
  })

  test('lists the saved address first, ahead of the seeded address, with a View link to its own details page', async ({
    page
  }) => {
    const nameAfterSeedAlphabetically = 'Zetland Livestock Ltd'
    await saveValidAddress(page, { name: nameAfterSeedAlphabetically })

    await expect(resultsLineOf(page)).toHaveText('Showing 1-2 of 2')
    await expect(page.getByRole('link', { name: /^View / })).toHaveText([
      `View ${nameAfterSeedAlphabetically}`,
      `View ${SEED_ADDRESS_NAME}`
    ])
    const viewLink = page.getByRole('link', {
      name: `View ${nameAfterSeedAlphabetically}`
    })
    await expect(viewLink).toHaveAttribute(
      'href',
      /^\/address-book\/[0-9a-f]{24}$/
    )
    await viewLink.click()
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: nameAfterSeedAlphabetically
      })
    ).toBeVisible()
  })

  test('finds the saved address by its name, a fragment of its address and part of its country name', async ({
    page
  }) => {
    await saveValidAddress(page, { countryCode: 'FR' })

    for (const term of [validAddress.name, 'drover', 'fran']) {
      await searchAndExpectSingleMatch(page, term, {
        matchName: validAddress.name
      })
    }
  })

  test('lists the saved address with each stored line on its own line, each but the last ending in a comma, and its country apart', async ({
    page
  }) => {
    await saveValidAddress(page)

    const table = page.getByRole('table')
    await expect(
      table.getByRole('cell', { name: validAddress.name, exact: true })
    ).toBeVisible()
    const addressCell = table.getByRole('cell', { name: "14 Drover's Way," })
    await expect(addressCell).toHaveText(
      /^14 Drover's Way,\nUnit 3,\nInverness,\nHighland,\nIV2 3JH$/,
      { useInnerText: true }
    )
    await expect(
      table
        .getByRole('row', { name: new RegExp(validAddress.name) })
        .getByRole('cell', { name: 'United Kingdom', exact: true })
    ).toBeVisible()
  })
})

test.describe('cancel', () => {
  test('returns to the address book without creating an address', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-add-cancel' })
    await page.goto(ADD_PATH)

    await page.getByLabel(NAME_LABEL).fill('Should not be saved')

    await page
      .getByRole('link', { name: 'Cancel and return to address book' })
      .click()

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(page.getByText('Should not be saved')).toHaveCount(0)
  })
})
