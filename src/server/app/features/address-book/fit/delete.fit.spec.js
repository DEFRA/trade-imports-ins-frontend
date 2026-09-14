import { test, expect } from '@playwright/test'

import {
  expectNoSeriousOrCriticalAxeViolations,
  signIn
} from './address-form.js'
import { SEED_ADDRESS_ID, SEED_ADDRESS_NAME } from './seed-address.js'

const CONFIRM_PAGE_TITLE = 'Delete address'

async function openDeleteConfirmation(page, organisationId) {
  await signIn(page, { organisationId })
  await page.goto(`/address-book/${SEED_ADDRESS_ID}/delete`)
}

test.describe('delete address', () => {
  test('asks for confirmation and names the address being deleted', async ({
    page
  }) => {
    await openDeleteConfirmation(page, 'stub-org-delete-confirm')

    await expect(
      page.getByRole('heading', { level: 1, name: CONFIRM_PAGE_TITLE })
    ).toBeVisible()
    await expect(
      page.getByText(
        `Are you sure you want to delete ${SEED_ADDRESS_NAME} from your address book?`
      )
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `/address-book/${SEED_ADDRESS_ID}`
    )
  })

  test('Cancel returns to the address details with nothing deleted', async ({
    page
  }) => {
    await openDeleteConfirmation(page, 'stub-org-delete-cancel')

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page).toHaveURL(
      new RegExp(`/address-book/${SEED_ADDRESS_ID}$`)
    )
    await expect(
      page.getByRole('heading', { level: 1, name: SEED_ADDRESS_NAME })
    ).toBeVisible()

    await page.goto('/address-book')
    await expect(
      page.getByRole('link', { name: `View ${SEED_ADDRESS_NAME}` })
    ).toBeVisible()
  })

  test('confirming removes the address and confirms it on the address book', async ({
    page
  }) => {
    // Deleting mutates the stub's per-organisation store, so this test needs an
    // organisation of its own - the store is shared across parallel workers.
    await openDeleteConfirmation(
      page,
      `stub-org-delete-save-${crypto.randomUUID()}`
    )

    await page.getByRole('button', { name: 'Yes, delete this address' }).click()

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(
      page.getByText(`${SEED_ADDRESS_NAME} deleted from your address book`)
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: `View ${SEED_ADDRESS_NAME}` })
    ).toHaveCount(0)
    await expect(page.getByText('You have no addresses yet.')).toBeVisible()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openDeleteConfirmation(page, 'stub-org-delete-axe')

    await expectNoSeriousOrCriticalAxeViolations(page, 'Delete address')
  })
})
