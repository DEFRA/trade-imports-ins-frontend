import { test, expect } from '@playwright/test'

import { expectAddressBookList } from './address-book-list.js'
import {
  fieldLabels,
  expectErrorFocusOn,
  setFieldValue
} from './address-form.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { expectDashboard } from './dashboard.js'
import {
  SEED_ADDRESS_ID,
  SEED_ADDRESS_NAME,
  MALFORMED_ADDRESS_ID,
  UNKNOWN_ADDRESS_ID
} from './seed-address.js'
import { signIn } from '../../../../../../fit/sign-in.js'

const EDIT_URL = new RegExp(`/address-book/${SEED_ADDRESS_ID}/edit$`)
const SEED_ADDRESS_PATH = `/address-book/${SEED_ADDRESS_ID}`
const RETURN_HOME = '?return=%2F'

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

const uniqueOrganisationId = (purpose) =>
  `stub-org-edit-${purpose}-${crypto.randomUUID()}`

async function openEditForm(page, organisationId, query = '') {
  await signIn(page, { organisationId })
  await page.goto(`${SEED_ADDRESS_PATH}/edit${query}`)
}

const save = (page) =>
  page.getByRole('button', { name: 'Save changes' }).click()

const cancel = (page) => page.getByRole('button', { name: 'Cancel' }).click()

test.describe('edit address', () => {
  test('prefills every field from the stored address', async ({ page }) => {
    await openEditForm(page, 'stub-org-edit-render')

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Edit address and contact details'
      })
    ).toBeVisible()
    for (const [field, value] of Object.entries(seedValues)) {
      await expect(page.getByLabel(fieldLabels[field])).toHaveValue(value)
    }
    for (const name of ['Address', 'Contact details']) {
      await expect(
        page.getByRole('heading', { level: 2, name, exact: true })
      ).toBeVisible()
    }
    await expect(
      page.getByLabel(fieldLabels.name, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText('For international numbers include the country code')
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', SEED_ADDRESS_PATH)
  })

  test('asks for the nine address fields in the add form order, Email address before Phone number', async ({
    page
  }) => {
    await openEditForm(page, 'stub-org-edit-field-order')

    await expect(page.locator('form label')).toHaveText([
      fieldLabels.name,
      fieldLabels.addressLine1,
      fieldLabels.addressLine2,
      fieldLabels.townOrCity,
      fieldLabels.county,
      fieldLabels.postcode,
      fieldLabels.countryCode,
      fieldLabels.email,
      fieldLabels.phone
    ])
  })

  test('lists the countries alphabetically with no blank option and the stored country selected', async ({
    page
  }) => {
    await openEditForm(page, 'stub-org-edit-countries')

    const select = page.getByLabel(fieldLabels.countryCode)
    const countryNames = await select.locator('option').allTextContents()
    expect(countryNames).toEqual(
      countryNames.toSorted((left, right) => left.localeCompare(right, 'en'))
    )
    await expect(select.locator('option[value=""]')).toHaveCount(0)
    await expect(select).toHaveValue('GB')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openEditForm(page, 'stub-org-edit-axe')

    await expectNoSeriousOrCriticalViolations(page, 'Edit address')
  })

  test('a rejected save keeps the edits rather than the stored address', async ({
    page
  }) => {
    await openEditForm(page, 'stub-org-edit-required')

    await setFieldValue(page, 'townOrCity', 'Fort William')
    await setFieldValue(page, 'name', '')
    await save(page)

    await expectErrorFocusOn(page, {
      message: 'Enter a name or organisation name',
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

    await expectNoSeriousOrCriticalViolations(
      page,
      'Edit address validation error'
    )
  })

  test('saving changes confirms them on the address book and renames the address row', async ({
    page
  }) => {
    const newName = 'Glen Tanar Estate'
    await openEditForm(page, uniqueOrganisationId('save'))

    await setFieldValue(page, 'name', newName)
    await setFieldValue(page, 'townOrCity', 'Aboyne')
    await save(page)

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(page.getByText(`${newName} address updated`)).toBeVisible()
    await expect(
      page.getByRole('link', { name: `View ${newName}` })
    ).toHaveAttribute('href', SEED_ADDRESS_PATH)
  })

  test('Cancel opens the address details with the stored name unchanged', async ({
    page
  }) => {
    await openEditForm(page, 'stub-org-edit-cancel')

    await setFieldValue(page, 'name', 'Should not be saved')
    await cancel(page)

    await expect(page).toHaveURL(new RegExp(`${SEED_ADDRESS_PATH}$`))
    await expect(
      page.getByRole('heading', { level: 1, name: SEED_ADDRESS_NAME })
    ).toBeVisible()
  })

  test.describe('opened from the dashboard', () => {
    test('Back goes to the dashboard', async ({ page }) => {
      await openEditForm(page, 'stub-org-edit-back-return', RETURN_HOME)

      await expect(
        page.getByRole('link', { name: 'Back', exact: true })
      ).toHaveAttribute('href', '/')
    })

    test('Cancel goes to the dashboard', async ({ page }) => {
      await openEditForm(page, 'stub-org-edit-cancel-return', RETURN_HOME)

      await cancel(page)

      await expectDashboard(page)
    })
  })

  test.describe('dead links', () => {
    test('an unknown address id returns to the address book', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-edit-unknown' })
      await page.goto(`/address-book/${UNKNOWN_ADDRESS_ID}/edit`)

      await expectAddressBookList(page)
    })

    test('an unknown address id with a return lands on the return', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-edit-unknown-return' })
      await page.goto(`/address-book/${UNKNOWN_ADDRESS_ID}/edit${RETURN_HOME}`)

      await expectDashboard(page)
    })

    test('a malformed address id returns to the address book', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-edit-malformed' })
      await page.goto(`/address-book/${MALFORMED_ADDRESS_ID}/edit`)

      await expectAddressBookList(page)
    })
  })
})
