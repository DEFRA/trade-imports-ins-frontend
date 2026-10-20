import { test, expect } from '@playwright/test'

import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { SEED_ADDRESS_ID, SEED_ADDRESS_NAME } from './seed-address.js'
import { signIn } from '../../../../../../fit/sign-in.js'

const CONFIRM_PAGE_TITLE = 'Delete this address?'
const CONFIRM_BUTTON = 'Yes, delete'
const CANCEL_LINK = 'No, cancel'
const DELETED_BANNER = 'Stub farm 1 address deleted'

async function openDeleteConfirmation(page, organisationId) {
  await signIn(page, { organisationId })
  await page.goto(`/address-book/${SEED_ADDRESS_ID}/delete`)
}

test.describe('delete address', () => {
  test('summarises the address being deleted and asks for confirmation', async ({
    page
  }) => {
    await openDeleteConfirmation(page, 'stub-org-delete-confirm')

    await expect(
      page.getByRole('heading', { level: 1, name: CONFIRM_PAGE_TITLE })
    ).toBeVisible()
    await expect(page.getByRole('term')).toHaveText(['Address'])
    await expect(page.getByRole('definition')).toHaveText(
      'Stub Farm 1 1 Stub Way Stubton ST1 1UB United Kingdom',
      { useInnerText: true }
    )
    await expect(page.getByText('stub-farm-1@example.com')).toHaveCount(0)
    await expect(
      page.getByText('Confirm that you want to delete this address.')
    ).toBeVisible()
    await expect(page.getByText('This action cannot be undone.')).toBeVisible()
    await expect(page.getByText('Are you sure you want to delete')).toHaveCount(
      0
    )
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', `/address-book/${SEED_ADDRESS_ID}`)
  })

  test('No, cancel returns to the address details with nothing deleted', async ({
    page
  }) => {
    await openDeleteConfirmation(page, 'stub-org-delete-cancel')

    await page.getByRole('link', { name: CANCEL_LINK }).click()

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
    await expect(page.getByText('address deleted')).toHaveCount(0)
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

    await page
      .getByRole('button', { name: CONFIRM_BUTTON, exact: true })
      .click()

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(page.getByText(DELETED_BANNER)).toBeVisible()
    await expect(
      page.getByRole('link', { name: `View ${SEED_ADDRESS_NAME}` })
    ).toHaveCount(0)
    await expect(page.getByText('You have no addresses yet.')).toBeVisible()
  })

  test.describe('return', () => {
    const withReturnOf = (path, returnTo) =>
      `${path}?return=${encodeURIComponent(returnTo)}`

    test('reached with a return, Back and No, cancel go to the view page still carrying it', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-delete-return' })
      await page.goto(
        withReturnOf(`/address-book/${SEED_ADDRESS_ID}/delete`, '/')
      )

      const viewHref = `/address-book/${SEED_ADDRESS_ID}?return=%2F`
      await expect(
        page.getByRole('link', { name: 'Back', exact: true })
      ).toHaveAttribute('href', viewHref)
      await expect(
        page.getByRole('link', { name: CANCEL_LINK })
      ).toHaveAttribute('href', viewHref)

      await page.getByRole('link', { name: CANCEL_LINK }).click()

      await expect(page).toHaveURL(
        new RegExp(`/address-book/${SEED_ADDRESS_ID}\\?return=%2F$`)
      )
      await expect(
        page.getByRole('heading', { level: 1, name: SEED_ADDRESS_NAME })
      ).toBeVisible()
    })

    test('Yes, delete lands on the return page', async ({ page }) => {
      await signIn(page, {
        organisationId: `stub-org-delete-return-land-${crypto.randomUUID()}`
      })
      await page.goto(
        withReturnOf(`/address-book/${SEED_ADDRESS_ID}/delete`, '/')
      )

      await page
        .getByRole('button', { name: CONFIRM_BUTTON, exact: true })
        .click()

      await expect(page).toHaveURL(/\/$/)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Dashboard' })
      ).toBeVisible()

      await page.goto('/address-book')
      await expect(page.getByText(DELETED_BANNER)).toHaveCount(0)
      await expect(page.getByText('You have no addresses yet.')).toBeVisible()
    })

    test("Yes, delete with a return to the deleted address's own page lands on the list", async ({
      page
    }) => {
      await signIn(page, {
        organisationId: `stub-org-delete-return-own-${crypto.randomUUID()}`
      })
      await page.goto(
        withReturnOf(
          `/address-book/${SEED_ADDRESS_ID}/delete`,
          `/address-book/${SEED_ADDRESS_ID}`
        )
      )

      await page
        .getByRole('button', { name: CONFIRM_BUTTON, exact: true })
        .click()

      await expect(page).toHaveURL(/\/address-book$/)
      await expect(page.getByText(DELETED_BANNER)).toBeVisible()
    })

    test('ignores a return on another origin', async ({ page }) => {
      await signIn(page, {
        organisationId: `stub-org-delete-return-ignored-${crypto.randomUUID()}`
      })
      await page.goto(
        withReturnOf(
          `/address-book/${SEED_ADDRESS_ID}/delete`,
          'https://evil.example/'
        )
      )

      const viewHref = `/address-book/${SEED_ADDRESS_ID}`
      await expect(
        page.getByRole('link', { name: 'Back', exact: true })
      ).toHaveAttribute('href', viewHref)
      await expect(
        page.getByRole('link', { name: CANCEL_LINK })
      ).toHaveAttribute('href', viewHref)

      await page
        .getByRole('button', { name: CONFIRM_BUTTON, exact: true })
        .click()

      await expect(page).toHaveURL(/\/address-book$/)
      await expect(page.getByText(DELETED_BANNER)).toBeVisible()
    })
  })

  test.describe('dead links', () => {
    async function expectAddressBookList(page) {
      await expect(page).toHaveURL(/\/address-book$/)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Address book' })
      ).toBeVisible()
      await expect(page.getByText('Page not found')).toHaveCount(0)
    }

    test('an unknown address id returns to the address book', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-delete-unknown' })
      await page.goto('/address-book/ffffffffffffffffffffffff/delete')

      await expectAddressBookList(page)
    })

    test('a dead delete link carrying an honoured return lands on it', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-delete-dead-return' })
      await page.goto(
        '/address-book/ffffffffffffffffffffffff/delete?return=%2F'
      )

      await expect(page).toHaveURL(/\/$/)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Dashboard' })
      ).toBeVisible()
      await expect(page.getByText('Page not found')).toHaveCount(0)
    })

    test('a malformed address id returns to the address book', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-delete-malformed' })
      await page.goto('/address-book/not-a-valid-id/delete')

      await expectAddressBookList(page)
    })

    test('a stale delete changes nothing and shows no banner', async ({
      page
    }) => {
      await openDeleteConfirmation(
        page,
        `stub-org-delete-stale-${crypto.randomUUID()}`
      )

      const other = await page.context().newPage()
      await other.goto(`/address-book/${SEED_ADDRESS_ID}/delete`)
      await other
        .getByRole('button', { name: CONFIRM_BUTTON, exact: true })
        .click()
      await expect(other.getByText(DELETED_BANNER)).toBeVisible()
      await other.close()

      await page
        .getByRole('button', { name: CONFIRM_BUTTON, exact: true })
        .click()

      await expectAddressBookList(page)
      await expect(page.getByText('address deleted')).toHaveCount(0)
    })
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openDeleteConfirmation(page, 'stub-org-delete-axe')

    await expectNoSeriousOrCriticalViolations(page, 'Delete address')
  })
})
