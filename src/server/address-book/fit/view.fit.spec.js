import { test, expect } from '@playwright/test'

import {
  expectNoSeriousOrCriticalAxeViolations,
  signIn
} from './address-form.js'

// The stub seeds one address per organisation at a deterministic id
// (address-book-client.stub.js), so a spec can address it directly.
const SEED_ADDRESS_NAME = 'Stub Farm 1'
const SEED_ADDRESS_ID = '000000000000000000000001'

async function openSeedAddress(page, organisationId) {
  await signIn(page, { organisationId })
  await page.goto(`/address-book/${SEED_ADDRESS_ID}`)
}

test.describe('view address', () => {
  test('clicking View on a row opens that address details page', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-view-open' })
    await page.goto('/address-book')

    await page.getByRole('link', { name: `View ${SEED_ADDRESS_NAME}` }).click()

    await expect(page).toHaveURL(
      new RegExp(`/address-book/${SEED_ADDRESS_ID}$`)
    )
    await expect(
      page.getByRole('heading', { level: 1, name: SEED_ADDRESS_NAME })
    ).toBeVisible()
  })

  test('lists every Standard Address Block field against its label', async ({
    page
  }) => {
    await openSeedAddress(page, 'stub-org-view-rows')

    await expect(page.getByRole('term')).toHaveText([
      'Name or organisation name',
      'Address line 1',
      'Address line 2 (optional)',
      'Town or city',
      'County',
      'Postcode or Zip code',
      'Country',
      'Email address',
      'Phone number'
    ])
    await expect(page.getByRole('definition')).toHaveText([
      SEED_ADDRESS_NAME,
      '1 Stub Way',
      '',
      'Stubton',
      '',
      'ST1 1UB',
      'United Kingdom',
      'stub-farm-1@example.com',
      '01234567890'
    ])
  })

  test('offers Edit and Delete for the address being viewed', async ({
    page
  }) => {
    await openSeedAddress(page, 'stub-org-view-actions')

    // govukButton with an href renders an anchor with role="button", so these
    // are buttons in the accessibility tree rather than links.
    const edit = page.getByRole('button', { name: 'Edit' })
    const remove = page.getByRole('button', { name: 'Delete' })

    await expect(edit).toBeVisible()
    await expect(edit).toHaveAttribute(
      'href',
      `/address-book/${SEED_ADDRESS_ID}/edit`
    )
    await expect(remove).toBeVisible()
    await expect(remove).toHaveAttribute(
      'href',
      `/address-book/${SEED_ADDRESS_ID}/delete`
    )
  })

  test('Back returns to the address book', async ({ page }) => {
    await openSeedAddress(page, 'stub-org-view-back')

    await page.getByRole('link', { name: 'Back' }).click()

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Address book' })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openSeedAddress(page, 'stub-org-view-axe')

    await expectNoSeriousOrCriticalAxeViolations(page, 'Address details')
  })
})
