import { test, expect } from '@playwright/test'

import {
  expectAddressBookList,
  expectEmptyAddressBookList
} from './address-book-list.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { expectDashboard } from './dashboard.js'
import {
  SEED_ADDRESS_ID,
  SEED_ADDRESS_NAME,
  MALFORMED_ADDRESS_ID,
  UNKNOWN_ADDRESS_ID
} from './seed-address.js'
import { signIn } from '../../../../../../fit/sign-in.js'

const CONFIRM_PAGE_TITLE = 'Delete this address?'
const CANCEL_LINK = 'No, cancel'
const DELETED_BANNER = `${SEED_ADDRESS_NAME} address deleted`

const confirmButtonOf = (page) =>
  page.getByRole('button', { name: 'Yes, delete', exact: true })

const backLinkOf = (page) =>
  page.getByRole('link', { name: 'Back', exact: true })

const signInAndOpenSeedAddressDelete = async (
  page,
  organisationId,
  { returnTo } = {}
) => {
  await signIn(page, { organisationId })
  const deletePath = `/address-book/${SEED_ADDRESS_ID}/delete`
  await page.goto(
    returnTo === undefined
      ? deletePath
      : `${deletePath}?return=${encodeURIComponent(returnTo)}`
  )
}

test.describe('delete address', () => {
  test('summarises the address being deleted and asks for confirmation', async ({
    page
  }) => {
    await signInAndOpenSeedAddressDelete(page, 'stub-org-delete-confirm')

    await expect(
      page.getByRole('heading', { level: 1, name: CONFIRM_PAGE_TITLE })
    ).toBeVisible()
    await expect(page.getByRole('term')).toHaveText(['Address'])
    await expect(page.getByRole('definition')).toHaveText(
      'Stub Farm 1 1 Stub Way Stubton ST1 1UB United Kingdom',
      { useInnerText: true }
    )
    await expect(
      page.getByText('Confirm that you want to delete this address.')
    ).toBeVisible()
    await expect(
      page.getByText('Deletions are permanent and you cannot undo this.')
    ).toBeVisible()
    await expect(backLinkOf(page)).toHaveAttribute(
      'href',
      `/address-book/${SEED_ADDRESS_ID}`
    )
  })

  test('No, cancel returns to the address details with nothing deleted', async ({
    page
  }) => {
    await signInAndOpenSeedAddressDelete(page, 'stub-org-delete-cancel')

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
    await signInAndOpenSeedAddressDelete(
      page,
      `stub-org-delete-save-${crypto.randomUUID()}`
    )

    await confirmButtonOf(page).click()

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(page.getByText(DELETED_BANNER)).toBeVisible()
    await expectEmptyAddressBookList(page)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signInAndOpenSeedAddressDelete(page, 'stub-org-delete-axe')

    await expectNoSeriousOrCriticalViolations(page, CONFIRM_PAGE_TITLE)
  })

  test.describe('return', () => {
    test('reached with a return, Back and No, cancel go to the view page still carrying it', async ({
      page
    }) => {
      await signInAndOpenSeedAddressDelete(page, 'stub-org-delete-return', {
        returnTo: '/'
      })

      const addressPageHref = `/address-book/${SEED_ADDRESS_ID}?return=%2F`
      await expect(backLinkOf(page)).toHaveAttribute('href', addressPageHref)
      await expect(
        page.getByRole('link', { name: CANCEL_LINK })
      ).toHaveAttribute('href', addressPageHref)

      await page.getByRole('link', { name: CANCEL_LINK }).click()

      await expect(page).toHaveURL(
        new RegExp(`/address-book/${SEED_ADDRESS_ID}\\?return=%2F$`)
      )
      await expect(
        page.getByRole('heading', { level: 1, name: SEED_ADDRESS_NAME })
      ).toBeVisible()
    })

    test('Yes, delete lands on the return page', async ({ page }) => {
      await signInAndOpenSeedAddressDelete(
        page,
        `stub-org-delete-return-land-${crypto.randomUUID()}`,
        { returnTo: '/' }
      )

      await confirmButtonOf(page).click()

      await expectDashboard(page)

      await page.goto('/address-book')
      await expect(page.getByText(DELETED_BANNER)).toHaveCount(0)
      await expectEmptyAddressBookList(page)
    })

    test("Yes, delete with a return to the deleted address's own page lands on the list", async ({
      page
    }) => {
      await signInAndOpenSeedAddressDelete(
        page,
        `stub-org-delete-return-own-${crypto.randomUUID()}`,
        { returnTo: `/address-book/${SEED_ADDRESS_ID}` }
      )

      await confirmButtonOf(page).click()

      await expect(page).toHaveURL(/\/address-book$/)
      await expect(page.getByText(DELETED_BANNER)).toBeVisible()
    })

    test('ignores a return on another origin', async ({ page }) => {
      await signInAndOpenSeedAddressDelete(
        page,
        `stub-org-delete-return-ignored-${crypto.randomUUID()}`,
        { returnTo: 'https://evil.example/' }
      )

      const addressPageHref = `/address-book/${SEED_ADDRESS_ID}`
      await expect(backLinkOf(page)).toHaveAttribute('href', addressPageHref)
      await expect(
        page.getByRole('link', { name: CANCEL_LINK })
      ).toHaveAttribute('href', addressPageHref)

      await confirmButtonOf(page).click()

      await expect(page).toHaveURL(/\/address-book$/)
      await expect(page.getByText(DELETED_BANNER)).toBeVisible()
    })
  })
})

test.describe('delete address dead links', () => {
  test('an unknown address id returns to the address book', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-delete-unknown' })
    await page.goto(`/address-book/${UNKNOWN_ADDRESS_ID}/delete`)

    await expectAddressBookList(page)
  })

  test('a dead delete link carrying an honoured return lands on it', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-delete-dead-return' })
    await page.goto(`/address-book/${UNKNOWN_ADDRESS_ID}/delete?return=%2F`)

    await expectDashboard(page)
    await expect(page.getByText('Page not found')).toHaveCount(0)
  })

  test('a malformed address id returns to the address book', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-delete-malformed' })
    await page.goto(`/address-book/${MALFORMED_ADDRESS_ID}/delete`)

    await expectAddressBookList(page)
  })

  test('a stale delete returns to the address book without a deleted banner', async ({
    page
  }) => {
    await signInAndOpenSeedAddressDelete(
      page,
      `stub-org-delete-stale-${crypto.randomUUID()}`
    )

    const secondTab = await page.context().newPage()
    await secondTab.goto(`/address-book/${SEED_ADDRESS_ID}/delete`)
    await confirmButtonOf(secondTab).click()
    await expect(secondTab.getByText(DELETED_BANNER)).toBeVisible()
    await secondTab.close()

    await confirmButtonOf(page).click()

    await expectAddressBookList(page)
    await expect(page.getByText('address deleted')).toHaveCount(0)
  })
})
