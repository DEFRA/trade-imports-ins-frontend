import { test, expect } from '@playwright/test'

import {
  expectAddressBookList,
  expectEmptyAddressBookList
} from './address-book-list.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { expectDashboard } from './dashboard.js'
import { withReturn } from './return-query.js'
import {
  seedAddress,
  seedAddressLines,
  MALFORMED_ADDRESS_ID,
  UNKNOWN_ADDRESS_ID
} from './seed-address.js'
import {
  addressBookPath,
  addressDeletePath,
  addressPath,
  dashboardPath
} from '../../../shared/paths.js'
import { signIn } from '../../../../../../fit/sign-in.js'

const CONFIRM_PAGE_TITLE = 'Delete this address?'
const CANCEL_LINK = 'No, cancel'
const DELETED_BANNER = `${seedAddress.name} address deleted`
const seedViewPath = addressPath(seedAddress.id)
const seedDeletePath = addressDeletePath(seedAddress.id)

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
  await page.goto(withReturn(seedDeletePath, returnTo))
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
      [seedAddress.name, ...seedAddressLines, 'United Kingdom'].join(' '),
      { useInnerText: true }
    )
    await expect(
      page.getByText('Confirm that you want to delete this address.')
    ).toBeVisible()
    await expect(
      page.getByText('Deletions are permanent and you cannot undo this.')
    ).toBeVisible()
    await expect(backLinkOf(page)).toHaveAttribute('href', seedViewPath)
  })

  test('No, cancel returns to the address details with nothing deleted', async ({
    page
  }) => {
    await signInAndOpenSeedAddressDelete(page, 'stub-org-delete-cancel')

    await page.getByRole('link', { name: CANCEL_LINK }).click()

    await expect(page).toHaveURL(seedViewPath)
    await expect(
      page.getByRole('heading', { level: 1, name: seedAddress.name })
    ).toBeVisible()

    await page.goto(addressBookPath())
    await expect(
      page.getByRole('link', { name: `View ${seedAddress.name}` })
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

    await expect(page).toHaveURL(addressBookPath())
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
        returnTo: dashboardPath()
      })

      const addressPageHref = withReturn(seedViewPath, dashboardPath())
      await expect(backLinkOf(page)).toHaveAttribute('href', addressPageHref)
      await expect(
        page.getByRole('link', { name: CANCEL_LINK })
      ).toHaveAttribute('href', addressPageHref)

      await page.getByRole('link', { name: CANCEL_LINK }).click()

      await expect(page).toHaveURL(addressPageHref)
      await expect(
        page.getByRole('heading', { level: 1, name: seedAddress.name })
      ).toBeVisible()
    })

    test('Yes, delete lands on the return page', async ({ page }) => {
      await signInAndOpenSeedAddressDelete(
        page,
        `stub-org-delete-return-land-${crypto.randomUUID()}`,
        { returnTo: dashboardPath() }
      )

      await confirmButtonOf(page).click()

      await expectDashboard(page)

      await page.goto(addressBookPath())
      await expect(page.getByText(DELETED_BANNER)).toHaveCount(0)
      await expectEmptyAddressBookList(page)
    })

    test("Yes, delete with a return to the deleted address's own page lands on the list", async ({
      page
    }) => {
      await signInAndOpenSeedAddressDelete(
        page,
        `stub-org-delete-return-own-${crypto.randomUUID()}`,
        { returnTo: seedViewPath }
      )

      await confirmButtonOf(page).click()

      await expect(page).toHaveURL(addressBookPath())
      await expect(page.getByText(DELETED_BANNER)).toBeVisible()
    })

    test('ignores a return on another origin', async ({ page }) => {
      await signInAndOpenSeedAddressDelete(
        page,
        `stub-org-delete-return-ignored-${crypto.randomUUID()}`,
        { returnTo: 'https://evil.example/' }
      )

      await expect(backLinkOf(page)).toHaveAttribute('href', seedViewPath)
      await expect(
        page.getByRole('link', { name: CANCEL_LINK })
      ).toHaveAttribute('href', seedViewPath)

      await confirmButtonOf(page).click()

      await expect(page).toHaveURL(addressBookPath())
      await expect(page.getByText(DELETED_BANNER)).toBeVisible()
    })
  })
})

test.describe('delete address dead links', () => {
  test('an unknown address id returns to the address book', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-delete-unknown' })
    await page.goto(addressDeletePath(UNKNOWN_ADDRESS_ID))

    await expectAddressBookList(page)
  })

  test('a dead delete link carrying an honoured return lands on it', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-delete-dead-return' })
    await page.goto(
      withReturn(addressDeletePath(UNKNOWN_ADDRESS_ID), dashboardPath())
    )

    await expectDashboard(page)
    await expect(page.getByText('Page not found')).toHaveCount(0)
  })

  test('a malformed address id returns to the address book', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-delete-malformed' })
    await page.goto(addressDeletePath(MALFORMED_ADDRESS_ID))

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
    await secondTab.goto(seedDeletePath)
    await confirmButtonOf(secondTab).click()
    await expect(secondTab.getByText(DELETED_BANNER)).toBeVisible()
    await secondTab.close()

    await confirmButtonOf(page).click()

    await expectAddressBookList(page)
    await expect(page.getByText('address deleted')).toHaveCount(0)
  })
})
