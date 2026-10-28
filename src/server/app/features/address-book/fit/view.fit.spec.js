import { test, expect } from '@playwright/test'

import { expectAddressBookList } from './address-book-list.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import {
  addValidAddressToFreshOrganisation,
  validAddress,
  validAddressViewLink
} from './address-form.js'
import { expectDashboard } from './dashboard.js'
import { withReturn } from './return-query.js'
import {
  seedAddress,
  MALFORMED_ADDRESS_ID,
  UNKNOWN_ADDRESS_ID
} from './seed-address.js'
import {
  addressBookPath,
  addressDeletePath,
  addressEditPath,
  addressPath,
  dashboardPath
} from '../../../shared/paths.js'
import { signIn } from '../../../../../../fit/sign-in.js'

const seedViewPath = addressPath(seedAddress.id)
const seedEditPath = addressEditPath(seedAddress.id)
const seedDeletePath = addressDeletePath(seedAddress.id)

const IGNORED_RETURNS = [
  ['another origin', 'https://evil.example/'],
  ['protocol-relative', '//evil.example/'],
  ['not a path', 'address-book']
]

async function openSeedAddress(page, organisationId) {
  await signIn(page, { organisationId })
  await page.goto(seedViewPath)
}

test.describe('view address', () => {
  test('clicking View on a row opens that address details page', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-view-open' })
    await page.goto(addressBookPath())

    await page.getByRole('link', { name: `View ${seedAddress.name}` }).click()

    await expect(page).toHaveURL(seedViewPath)
    await expect(
      page.getByRole('heading', { level: 1, name: seedAddress.name })
    ).toBeVisible()
  })

  test('leaves out a blank address line 2 and county', async ({ page }) => {
    await openSeedAddress(page, 'stub-org-view-rows')

    await expect(page.getByRole('term')).toHaveText([
      'Name or organisation',
      'Address line 1',
      'Town or city',
      'Postcode or Zip code',
      'Country',
      'Email address',
      'Phone number'
    ])
    await expect(page.getByRole('definition')).toHaveText([
      seedAddress.name,
      seedAddress.addressLine1,
      seedAddress.townOrCity,
      seedAddress.postcode,
      'United Kingdom',
      seedAddress.email,
      seedAddress.phone
    ])
  })

  test('shows address line 2 and County (optional) when the address has them', async ({
    page
  }) => {
    await addValidAddressToFreshOrganisation(page, {
      organisationPrefix: 'stub-org-view-optional'
    })
    await validAddressViewLink(page).click()

    await expect(page.getByRole('term')).toHaveText([
      'Name or organisation',
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
    await expect(editButton).toHaveAttribute('href', seedEditPath)
    await expect(editButton).toHaveClass(/govuk-button--secondary/)
    await expect(deleteButton).toBeVisible()
    await expect(deleteButton).toHaveAttribute('href', seedDeletePath)
    await expect(deleteButton).toHaveClass(/govuk-button--warning/)
  })

  test.describe('dead links', () => {
    test('an unknown address id returns to the address book', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-view-unknown' })
      await page.goto(addressPath(UNKNOWN_ADDRESS_ID))

      await expectAddressBookList(page)
    })

    test('a dead link carrying an honoured return lands on it', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-view-dead-return' })
      await page.goto(
        withReturn(addressPath(UNKNOWN_ADDRESS_ID), dashboardPath())
      )

      await expectDashboard(page)
    })

    test('a malformed address id returns to the address book', async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-view-malformed' })
      await page.goto(addressPath(MALFORMED_ADDRESS_ID))

      await expectAddressBookList(page)
    })

    test("another organisation's address returns to the address book", async ({
      page
    }) => {
      await addValidAddressToFreshOrganisation(page, {
        organisationPrefix: 'stub-org-view-owner'
      })
      const href = await validAddressViewLink(page).getAttribute('href')

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
      await page.goto(seedDeletePath)
      await page
        .getByRole('button', { name: 'Yes, delete', exact: true })
        .click()
      await page.goto(seedViewPath)

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
    await page.goto(withReturn(seedViewPath, dashboardPath()))

    await expect(page.getByRole('button', { name: 'Edit' })).toHaveAttribute(
      'href',
      withReturn(seedEditPath, dashboardPath())
    )
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'href',
      withReturn(seedDeletePath, dashboardPath())
    )

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expectDashboard(page)
  })

  for (const [kind, ignoredReturn] of IGNORED_RETURNS) {
    test(`ignores a return that is ${kind}`, async ({ page }) => {
      await signIn(page, { organisationId: `stub-org-view-ignore-${kind}` })
      await page.goto(withReturn(seedViewPath, ignoredReturn))

      await expect(
        page.getByRole('link', { name: 'Back', exact: true })
      ).toHaveAttribute('href', addressBookPath())
      await expect(
        page.getByRole('button', { name: 'Edit', exact: true })
      ).toHaveAttribute('href', seedEditPath)
      await expect(
        page.getByRole('button', { name: 'Delete', exact: true })
      ).toHaveAttribute('href', seedDeletePath)
    })
  }

  test('in stub mode a return on the animals frontend is ignored', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-view-return-animals' })
    await page.goto(
      withReturn(
        seedViewPath,
        'http://localhost:3000/live-animals/notifications'
      )
    )

    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', addressBookPath())
  })
})
