import { test, expect } from '@playwright/test'

import { signIn } from './address-form.js'

// The stub seeds one address per organisation at a deterministic id
// (address-book-client.stub.js), so a spec can address it directly.
const SEED_ADDRESS_NAME = 'Stub Farm 1'
const SEED_ADDRESS_ID = '000000000000000000000001'

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
})
