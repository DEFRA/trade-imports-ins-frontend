import { test, expect } from '@playwright/test'

import {
  ADDRESS_TYPE_PATH,
  NAME_LABEL,
  fillValidAddress
} from './address-form.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { signIn } from '../../../../../../fit/sign-in.js'

const TYPE_HEADING = 'Choose an address type'
const FORM_HEADING = 'Add address and contact details'
const TYPES = [
  ['Origin or Consignor', 'Place of origin, Consignor'],
  [
    'Destination, Consignee or Importer',
    'Place of destination, Consignee, Importer'
  ],
  ['Branch', 'Branch address']
]

const back = (page) => page.getByRole('link', { name: 'Back', exact: true })
const radios = (page) => page.getByRole('radio')
const cont = (page) => page.getByRole('button', { name: 'Continue' })

test.describe('choose an address type', () => {
  test('shows the caption, heading, the three types with their hints in order and no Transporter', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-address-type-render' })
    await page.goto(ADDRESS_TYPE_PATH)

    await expect(
      page.getByText('Add a new address', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: TYPE_HEADING })
    ).toBeVisible()
    await expect(radios(page)).toHaveCount(TYPES.length)
    for (const [index, [label, hint]] of TYPES.entries()) {
      const radio = radios(page).nth(index)
      await expect(radio).toHaveAccessibleName(label)
      await expect(radio).toHaveAccessibleDescription(hint)
    }
    await expect(page.getByLabel('Transporter')).toHaveCount(0)
    await expect(cont(page)).toBeVisible()
  })

  test('continuing with nothing chosen shows Select an address type and the link focuses the first option', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-address-type-error' })
    await page.goto(ADDRESS_TYPE_PATH)

    await cont(page).click()

    const link = page
      .getByRole('alert')
      .getByRole('link', { name: 'Select an address type', exact: true })
    await expect(link).toBeVisible()
    await expect(
      page.getByRole('group', { name: TYPE_HEADING })
    ).toHaveAccessibleDescription(/Select an address type/)
    await link.click()
    await expect(radios(page).first()).toBeFocused()
  })

  test('Back returns to the address book', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-address-type-back' })
    await page.goto(ADDRESS_TYPE_PATH)

    await back(page).click()

    await expect(page).toHaveURL(/\/address-book$/)
  })

  for (const [label] of TYPES) {
    test(`choosing ${label} opens ${FORM_HEADING} with Back to the chosen type`, async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-address-type-choose' })
      await page.goto(ADDRESS_TYPE_PATH)

      await page.getByLabel(label, { exact: true }).check()
      await cont(page).click()

      await expect(page).toHaveURL(/\/address-book\/add$/)
      await expect(
        page.getByText('Add new address', { exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole('heading', { level: 1, name: FORM_HEADING })
      ).toBeVisible()

      await back(page).click()

      await expect(
        page.getByRole('heading', { level: 1, name: TYPE_HEADING })
      ).toBeVisible()
      await expect(page.getByLabel(label, { exact: true })).toBeChecked()
    })
  }

  test('opening the address form with no type chosen goes to Choose an address type', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-address-type-direct' })

    await page.goto('/address-book/add')

    await expect(page).toHaveURL(/\/address-book\/add\/address-type$/)
    await expect(
      page.getByRole('heading', { level: 1, name: TYPE_HEADING })
    ).toBeVisible()
  })

  test('Add a new address on the list starts afresh with no type selected and empty fields', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-address-type-afresh' })
    await page.goto(ADDRESS_TYPE_PATH)
    await page.getByLabel('Branch', { exact: true }).check()
    await cont(page).click()
    await page.getByLabel(NAME_LABEL).fill('Half finished')

    await page.goto('/address-book')
    await page.getByRole('button', { name: 'Add a new address' }).click()

    for (const radio of await radios(page).all()) {
      await expect(radio).not.toBeChecked()
    }
    await page.getByLabel('Origin or Consignor', { exact: true }).check()
    await cont(page).click()
    await expect(page.getByLabel(NAME_LABEL)).toHaveValue('')
  })

  test('after a save the next add starts with no type selected', async ({
    page
  }) => {
    await signIn(page, {
      organisationId: `stub-org-address-type-save-${crypto.randomUUID()}`
    })
    await page.goto(ADDRESS_TYPE_PATH)
    await page.getByLabel('Branch', { exact: true }).check()
    await cont(page).click()
    await fillValidAddress(page)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL(/\/address-book$/)

    await page.goto(ADDRESS_TYPE_PATH)

    for (const radio of await radios(page).all()) {
      await expect(radio).not.toBeChecked()
    }
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-address-type-axe' })
    await page.goto(ADDRESS_TYPE_PATH)

    await expectNoSeriousOrCriticalViolations(page, 'Choose an address type')
  })

  test('validation error page has no serious or critical axe violations', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-address-type-error-axe' })
    await page.goto(ADDRESS_TYPE_PATH)
    await cont(page).click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Choose an address type validation error'
    )
  })
})
