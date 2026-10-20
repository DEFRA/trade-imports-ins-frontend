import { test, expect } from '@playwright/test'

import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { fillValidAddress, validAddress } from './address-form.js'
import { SEED_ADDRESS_ID, SEED_ADDRESS_NAME } from './seed-address.js'
import { signIn } from '../../../../../../fit/sign-in.js'

const ADDRESS_BOOK = '/address-book'

const IGNORED_RETURNS = [
  ['another origin', 'https://evil.example/'],
  ['protocol-relative', '//evil.example/'],
  ['not a path', 'address-book']
]

async function openSeedAddress(page, organisationId) {
  await signIn(page, { organisationId })
  await page.goto(`/address-book/${SEED_ADDRESS_ID}`)
}

test.describe('view address', () => {
  test('clicking View on a row opens that address details page', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-view-open' })
    await page.goto(ADDRESS_BOOK)

    await page.getByRole('link', { name: `View ${SEED_ADDRESS_NAME}` }).click()

    await expect(page).toHaveURL(
      new RegExp(`/address-book/${SEED_ADDRESS_ID}$`)
    )
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
    await page.goto('/address-book/add')
    await fillValidAddress(page)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.getByRole('link', { name: `View ${validAddress.name}` }).click()

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

    // govukButton with an href renders an anchor with role="button", so these
    // are buttons in the accessibility tree rather than links.
    const edit = page.getByRole('button', { name: 'Edit' })
    const remove = page.getByRole('button', { name: 'Delete' })

    await expect(edit).toBeVisible()
    await expect(edit).toHaveAttribute(
      'href',
      `/address-book/${SEED_ADDRESS_ID}/edit`
    )
    await expect(edit).toHaveClass(/govuk-button--secondary/)
    await expect(remove).toBeVisible()
    await expect(remove).toHaveAttribute(
      'href',
      `/address-book/${SEED_ADDRESS_ID}/delete`
    )
    await expect(remove).toHaveClass(/govuk-button--warning/)
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
      await signIn(page, { organisationId: 'stub-org-view-unknown' })
      await page.goto('/address-book/ffffffffffffffffffffffff')

      await expectAddressBookList(page)
    })

    test('a dead link carrying an honoured return lands on it', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-view-dead-return' })
      await page.goto('/address-book/ffffffffffffffffffffffff?return=%2F')

      await expect(page).toHaveURL(/\/$/)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Dashboard' })
      ).toBeVisible()
    })

    test('a malformed address id returns to the address book', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-view-malformed' })
      await page.goto('/address-book/not-a-valid-id')

      await expectAddressBookList(page)
    })

    test("another organisation's address returns to the address book", async ({
      page
    }) => {
      await signIn(page, {
        organisationId: `stub-org-view-owner-${crypto.randomUUID()}`
      })
      await page.goto('/address-book/add')
      await fillValidAddress(page)
      await page.getByRole('button', { name: 'Save and continue' }).click()
      const href = await page
        .getByRole('link', { name: `View ${validAddress.name}` })
        .getAttribute('href')

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
      await page.goto(`/address-book/${SEED_ADDRESS_ID}/delete`)
      await page
        .getByRole('button', { name: 'Yes, delete', exact: true })
        .click()
      await page.goto(`/address-book/${SEED_ADDRESS_ID}`)

      await expectAddressBookList(page)
    })
  })

  test('Back returns to the address book', async ({ page }) => {
    await openSeedAddress(page, 'stub-org-view-back')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Address book' })
    ).toBeVisible()
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
    await page.goto(`/address-book/${SEED_ADDRESS_ID}?return=%2F`)

    await expect(page.getByRole('button', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/address-book/${SEED_ADDRESS_ID}/edit?return=%2F`
    )
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'href',
      `/address-book/${SEED_ADDRESS_ID}/delete?return=%2F`
    )

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' })
    ).toBeVisible()
  })

  for (const [name, value] of IGNORED_RETURNS) {
    test(`ignores a return that is ${name}`, async ({ page }) => {
      await signIn(page, { organisationId: `stub-org-view-ignore-${name}` })
      await page.goto(
        `/address-book/${SEED_ADDRESS_ID}?return=${encodeURIComponent(value)}`
      )

      await expect(
        page.getByRole('link', { name: 'Back', exact: true })
      ).toHaveAttribute('href', ADDRESS_BOOK)
      await expect(
        page.getByRole('button', { name: 'Edit', exact: true })
      ).toHaveAttribute('href', `/address-book/${SEED_ADDRESS_ID}/edit`)
      await expect(
        page.getByRole('button', { name: 'Delete', exact: true })
      ).toHaveAttribute('href', `/address-book/${SEED_ADDRESS_ID}/delete`)
    })
  }

  test('in stub mode a return on the animals frontend is ignored', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-view-return-animals' })
    await page.goto(
      `/address-book/${SEED_ADDRESS_ID}?return=${encodeURIComponent('http://localhost:3000/live-animals/notifications')}`
    )

    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', ADDRESS_BOOK)
  })
})
