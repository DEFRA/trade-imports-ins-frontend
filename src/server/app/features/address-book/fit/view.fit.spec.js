import { test, expect } from '@playwright/test'

import { expectAddressBookList } from './address-book-list.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { addValidAddressAndGetViewLink, validAddress } from './address-form.js'
import { expectDashboard } from './dashboard.js'
import {
  SEED_ADDRESS_ID,
  SEED_ADDRESS_NAME,
  MALFORMED_ADDRESS_ID,
  UNKNOWN_ADDRESS_ID
} from './seed-address.js'
import { signIn } from '../../../../../../fit/sign-in.js'

const ADDRESS_BOOK_PATH = '/address-book'
const SEED_ADDRESS_PATH = `${ADDRESS_BOOK_PATH}/${SEED_ADDRESS_ID}`

const IGNORED_RETURNS = [
  ['another origin', 'https://evil.example/'],
  ['protocol-relative', '//evil.example/'],
  ['not a path', 'address-book']
]

async function openSeedAddress(page, organisationId) {
  await signIn(page, { organisationId })
  await page.goto(SEED_ADDRESS_PATH)
}

test.describe('view address', () => {
  test('clicking View on a row opens that address details page', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-view-open' })
    await page.goto(ADDRESS_BOOK_PATH)

    await page.getByRole('link', { name: `View ${SEED_ADDRESS_NAME}` }).click()

    await expect(page).toHaveURL(new RegExp(`${SEED_ADDRESS_PATH}$`))
    await expect(
      page.getByRole('heading', { level: 1, name: SEED_ADDRESS_NAME })
    ).toBeVisible()
  })

  test('leaves out a blank address line 2 and county', async ({ page }) => {
    await openSeedAddress(page, 'stub-org-view-rows')

    await expect(page.getByRole('term')).toHaveText([
      'Name or organisation name',
      'Address line 1',
      'Town or city',
      'Postcode or Zip code',
      'Country',
      'Email address',
      'Phone number'
    ])
    await expect(page.getByRole('definition')).toHaveText([
      SEED_ADDRESS_NAME,
      '1 Stub Way',
      'Stubton',
      'ST1 1UB',
      'United Kingdom',
      'stub-farm-1@example.com',
      '01234567890'
    ])
  })

  test('shows address line 2 and County (optional) when the address has them', async ({
    page
  }) => {
    await signIn(page, {
      organisationId: `stub-org-view-optional-${crypto.randomUUID()}`
    })
    const viewLink = await addValidAddressAndGetViewLink(page)
    await viewLink.click()

    await expect(page.getByRole('term')).toHaveText([
      'Name or organisation name',
      'Address line 1',
      'Address line 2 (optional)',
      'Town or city',
      'County (optional)',
      'Postcode or Zip code',
      'Country',
      'Email address',
      'Phone number'
    ])
    await expect(page.getByRole('definition')).toHaveText([
      validAddress.name,
      validAddress.addressLine1,
      validAddress.addressLine2,
      validAddress.townOrCity,
      validAddress.county,
      validAddress.postcode,
      'United Kingdom',
      validAddress.email,
      validAddress.phone
    ])
  })

  test('offers Edit and Delete for the address being viewed', async ({
    page
  }) => {
    await openSeedAddress(page, 'stub-org-view-actions')

    const editButton = page.getByRole('button', { name: 'Edit' })
    const deleteButton = page.getByRole('button', { name: 'Delete' })

    await expect(editButton).toBeVisible()
    await expect(editButton).toHaveAttribute(
      'href',
      `${SEED_ADDRESS_PATH}/edit`
    )
    await expect(editButton).toHaveClass(/govuk-button--secondary/)
    await expect(deleteButton).toBeVisible()
    await expect(deleteButton).toHaveAttribute(
      'href',
      `${SEED_ADDRESS_PATH}/delete`
    )
    await expect(deleteButton).toHaveClass(/govuk-button--warning/)
  })

  test.describe('dead links', () => {
    test('an unknown address id returns to the address book', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-view-unknown' })
      await page.goto(`${ADDRESS_BOOK_PATH}/${UNKNOWN_ADDRESS_ID}`)

      await expectAddressBookList(page)
    })

    test('a dead link carrying an honoured return lands on it', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-view-dead-return' })
      await page.goto(`${ADDRESS_BOOK_PATH}/${UNKNOWN_ADDRESS_ID}?return=%2F`)

      await expectDashboard(page)
    })

    test('a malformed address id returns to the address book', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-view-malformed' })
      await page.goto(`${ADDRESS_BOOK_PATH}/${MALFORMED_ADDRESS_ID}`)

      await expectAddressBookList(page)
    })

    test("another organisation's address returns to the address book", async ({
      page
    }) => {
      await signIn(page, {
        organisationId: `stub-org-view-owner-${crypto.randomUUID()}`
      })
      const viewLink = await addValidAddressAndGetViewLink(page)
      const href = await viewLink.getAttribute('href')

      await signIn(page, {
        organisationId: `stub-org-view-other-${crypto.randomUUID()}`
      })
      await page.goto(href)

      await expectAddressBookList(page)
      await expect(page.getByText(validAddress.name)).toHaveCount(0)
    })

    test('a deleted address returns to the address book', async ({ page }) => {
      await signIn(page, {
        organisationId: `stub-org-view-deleted-${crypto.randomUUID()}`
      })
      await page.goto(`${SEED_ADDRESS_PATH}/delete`)
      await page
        .getByRole('button', { name: 'Yes, delete', exact: true })
        .click()
      await page.goto(SEED_ADDRESS_PATH)

      await expectAddressBookList(page)
    })
  })

  test('Back returns to the address book', async ({ page }) => {
    await openSeedAddress(page, 'stub-org-view-back')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expectAddressBookList(page)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openSeedAddress(page, 'stub-org-view-axe')

    await expectNoSeriousOrCriticalViolations(page, 'Address details')
  })
})

test.describe('view address return', () => {
  test('Back follows an INS return, and Edit and Delete carry it on', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-view-return' })
    await page.goto(`${SEED_ADDRESS_PATH}?return=%2F`)

    await expect(page.getByRole('button', { name: 'Edit' })).toHaveAttribute(
      'href',
      `${SEED_ADDRESS_PATH}/edit?return=%2F`
    )
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'href',
      `${SEED_ADDRESS_PATH}/delete?return=%2F`
    )

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expectDashboard(page)
  })

  for (const [kind, ignoredReturn] of IGNORED_RETURNS) {
    test(`ignores a return that is ${kind}`, async ({ page }) => {
      await signIn(page, { organisationId: `stub-org-view-ignore-${kind}` })
      await page.goto(
        `${SEED_ADDRESS_PATH}?return=${encodeURIComponent(ignoredReturn)}`
      )

      await expect(
        page.getByRole('link', { name: 'Back', exact: true })
      ).toHaveAttribute('href', ADDRESS_BOOK_PATH)
      await expect(
        page.getByRole('button', { name: 'Edit', exact: true })
      ).toHaveAttribute('href', `${SEED_ADDRESS_PATH}/edit`)
      await expect(
        page.getByRole('button', { name: 'Delete', exact: true })
      ).toHaveAttribute('href', `${SEED_ADDRESS_PATH}/delete`)
    })
  }

  test('in stub mode a return on the animals frontend is ignored', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-view-return-animals' })
    await page.goto(
      `${SEED_ADDRESS_PATH}?return=${encodeURIComponent('http://localhost:3000/live-animals/notifications')}`
    )

    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', ADDRESS_BOOK_PATH)
  })
})
