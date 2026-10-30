import { test, expect } from '@playwright/test'

import { expectAddressBookList } from './address-book-list.js'
import {
  fieldLabels,
  expectErrorFocusOn,
  setFieldValue
} from './address-form.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { expectDashboard } from './dashboard.js'
import { withReturn } from './return-query.js'
import {
  seedAddress,
  MALFORMED_ADDRESS_ID,
  UNKNOWN_ADDRESS_ID
} from './seed-address.js'
import {
  addressBookPath,
  addressEditPath,
  addressPath,
  dashboardPath
} from '../../../shared/paths.js'
import { signIn } from '../../../../../../fit/sign-in.js'

const { id: seedAddressId, ...seedValues } = seedAddress
const seedEditPath = addressEditPath(seedAddressId)

const uniqueOrganisationId = (purpose) =>
  `stub-org-edit-${purpose}-${crypto.randomUUID()}`

async function openEditForm(page, organisationId, { returnTo } = {}) {
  await signIn(page, { organisationId })
  await page.goto(withReturn(seedEditPath, returnTo))
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
    ).toHaveAttribute('href', addressPath(seedAddressId))
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
      message: 'Enter a name or organisation',
      label: fieldLabels.name,
      expectedValue: '',
      url: seedEditPath
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
      url: seedEditPath
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

    await expect(page).toHaveURL(addressBookPath())
    await expect(page.getByText(`${newName} address updated`)).toBeVisible()
    await expect(
      page.getByRole('link', { name: `View ${newName}` })
    ).toHaveAttribute('href', addressPath(seedAddressId))
  })

  test('Cancel opens the address details with the stored name unchanged', async ({
    page
  }) => {
    await openEditForm(page, 'stub-org-edit-cancel')

    await setFieldValue(page, 'name', 'Should not be saved')
    await cancel(page)

    await expect(page).toHaveURL(addressPath(seedAddressId))
    await expect(
      page.getByRole('heading', { level: 1, name: seedAddress.name })
    ).toBeVisible()
  })

  test.describe('opened from the dashboard', () => {
    test('Back goes to the dashboard', async ({ page }) => {
      await openEditForm(page, 'stub-org-edit-back-return', {
        returnTo: dashboardPath()
      })

      await expect(
        page.getByRole('link', { name: 'Back', exact: true })
      ).toHaveAttribute('href', dashboardPath())
    })

    test('Cancel goes to the dashboard', async ({ page }) => {
      await openEditForm(page, 'stub-org-edit-cancel-return', {
        returnTo: dashboardPath()
      })

      await cancel(page)

      await expectDashboard(page)
    })
  })

  test.describe('dead links', () => {
    test('an unknown address id returns to the address book', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-edit-unknown' })
      await page.goto(addressEditPath(UNKNOWN_ADDRESS_ID))

      await expectAddressBookList(page)
    })

    test('an unknown address id with a return lands on the return', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-edit-unknown-return' })
      await page.goto(
        withReturn(addressEditPath(UNKNOWN_ADDRESS_ID), dashboardPath())
      )

      await expectDashboard(page)
    })

    test('a malformed address id returns to the address book', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-edit-malformed' })
      await page.goto(addressEditPath(MALFORMED_ADDRESS_ID))

      await expectAddressBookList(page)
    })
  })
})
