import { test, expect } from '@playwright/test'

import {
  expectErrorFocusOn,
  expectNoSeriousOrCriticalAxeViolations,
  fieldLabels,
  setFieldValue,
  signIn
} from './address-form.js'
import { SEED_ADDRESS_ID, SEED_ADDRESS_NAME } from './seed-address.js'

const PAGE_TITLE = 'Edit address details'
const EDIT_URL = new RegExp(`/address-book/${SEED_ADDRESS_ID}/edit$`)

const seedValues = {
  name: SEED_ADDRESS_NAME,
  addressLine1: '1 Stub Way',
  addressLine2: '',
  townOrCity: 'Stubton',
  county: '',
  postcode: 'ST1 1UB',
  countryCode: 'GB',
  phone: '01234567890',
  email: 'stub-farm-1@example.com'
}

async function openEditForm(page, organisationId) {
  await signIn(page, { organisationId })
  await page.goto(`/address-book/${SEED_ADDRESS_ID}/edit`)
}

const save = (page) =>
  page.getByRole('button', { name: 'Save changes' }).click()

test.describe('edit address', () => {
  test('prefills every field from the stored address', async ({ page }) => {
    await openEditForm(page, 'stub-org-edit-render')

    await expect(
      page.getByRole('heading', { level: 1, name: PAGE_TITLE })
    ).toBeVisible()
    for (const [field, value] of Object.entries(seedValues)) {
      await expect(page.getByLabel(fieldLabels[field])).toHaveValue(value)
    }
    await expect(
      page.getByText('For international numbers include the country code')
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `/address-book/${SEED_ADDRESS_ID}`
    )
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openEditForm(page, 'stub-org-edit-axe')

    await expectNoSeriousOrCriticalAxeViolations(page, 'Edit address')
  })

  test('a rejected save keeps the edits rather than the stored address', async ({
    page
  }) => {
    await openEditForm(page, 'stub-org-edit-required')

    // Clearing a required field bounces the save. The town is edited at the
    // same time so the redisplay has to choose between what was typed and
    // what is stored - re-rendering from the record would silently discard it.
    await setFieldValue(page, 'townOrCity', 'Fort William')
    await setFieldValue(page, 'name', '')
    await save(page)

    await expectErrorFocusOn(page, {
      message: 'Enter a name',
      label: fieldLabels.name,
      expectedValue: '',
      url: EDIT_URL
    })
    await expect(page.getByLabel(fieldLabels.townOrCity)).toHaveValue(
      'Fort William'
    )
  })

  test('a malformed email is rejected and the value preserved', async ({
    page
  }) => {
    await openEditForm(page, 'stub-org-edit-email')

    await setFieldValue(page, 'email', 'not-an-email')
    await save(page)

    await expectErrorFocusOn(page, {
      message: 'Enter an email address in the correct format',
      label: fieldLabels.email,
      expectedValue: 'not-an-email',
      url: EDIT_URL
    })
  })

  test('the validation error state has no serious or critical axe violations', async ({
    page
  }) => {
    await openEditForm(page, 'stub-org-edit-validation-axe')

    await setFieldValue(page, 'name', '')
    await save(page)
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalAxeViolations(
      page,
      'Edit address validation error'
    )
  })

  test('saving changes confirms them on the address book', async ({ page }) => {
    // Saving mutates the stub's per-organisation store, which is shared across
    // parallel workers, so this test needs an organisation of its own.
    await openEditForm(page, `stub-org-edit-save-${crypto.randomUUID()}`)

    await setFieldValue(page, 'name', 'Glen Tanar Estate')
    await setFieldValue(page, 'townOrCity', 'Aboyne')
    await save(page)

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(
      page.getByText('Glen Tanar Estate updated in your address book')
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'View Glen Tanar Estate' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: `View ${SEED_ADDRESS_NAME}` })
    ).toHaveCount(0)
  })

  test('Cancel returns to the address book without saving', async ({
    page
  }) => {
    await openEditForm(page, 'stub-org-edit-cancel')

    await setFieldValue(page, 'name', 'Should not be saved')
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(page.getByText('Should not be saved')).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: `View ${SEED_ADDRESS_NAME}` })
    ).toBeVisible()
  })
})
