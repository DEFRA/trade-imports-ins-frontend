import { test, expect } from '@playwright/test'

import {
  addValidAddressToFreshOrganisation,
  addressFormCountryNames,
  expectErrorFocusOn,
  fieldLabels,
  fillValidAddress,
  maxLengthValidations,
  requiredValidations,
  validAddress
} from './address-form.js'
import {
  resultsLineOf,
  searchAndExpectSingleMatch
} from './address-book-list.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { GB_COUNTRY } from '../address-countries.js'
import { seedAddress } from './seed-address.js'
import { addressAddPath, addressBookPath } from '../../../shared/paths.js'
import { signIn } from '../../../../../../fit/sign-in.js'
import { AUTOCOMPLETE_BY_FIELD } from '../../../../common/test-helpers/address-form-autocomplete.js'
import { JOURNEY_HANDSHAKES_BY_ROLE } from '../../../../common/test-helpers/journey-handshake.js'

const COUNTRY_PLACEHOLDER = 'Select a country'

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

test.describe('add address', () => {
  test('renders every field, hints and populated country options', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-add-render' })
    await page.goto(addressAddPath())

    await expect(
      page.getByRole('heading', { name: 'Add address and contact details' })
    ).toBeVisible()
    await expect(
      page.getByLabel(fieldLabels.name, { exact: true })
    ).toBeVisible()
    for (const [, label] of [
      ...requiredValidations,
      ['addressLine2', fieldLabels.addressLine2],
      ['county', fieldLabels.county]
    ]) {
      await expect(page.getByLabel(label)).toBeVisible()
    }
    await expect(
      page.getByText('For international numbers include the country code')
    ).toBeVisible()

    const country = page.getByLabel('Country')
    await expect(country).toHaveValue('')
    await expect(country.getByRole('option').first()).toHaveText(
      COUNTRY_PLACEHOLDER
    )
    await expect(
      country.getByRole('option', { name: GB_COUNTRY.name })
    ).toHaveCount(1)
  })

  test('has a Back link to the address book', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-back' })
    await page.goto(addressAddPath())

    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', addressBookPath())
  })

  test('groups fields under Address and Contact details', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-sections' })
    await page.goto(addressAddPath())

    for (const name of ['Address', 'Contact details']) {
      await expect(
        page.getByRole('heading', { level: 2, name, exact: true })
      ).toBeVisible()
    }
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-axe' })
    await page.goto(addressAddPath())

    await expectNoSeriousOrCriticalViolations(page, 'Add address')
  })
})

test.describe('add address reached from a notification journey', () => {
  const openFromJourney = async (
    page,
    organisationId,
    handshake = JOURNEY_HANDSHAKES_BY_ROLE.consignor
  ) => {
    await signIn(page, { organisationId })
    await page.goto(`${addressAddPath()}?${new URLSearchParams(handshake)}`)
  }

  test('shows the Draft status and notification reference above the caption, heading, section headings and fields', async ({
    page
  }) => {
    await openFromJourney(page, 'stub-org-add-journey')

    await expect(page).toHaveTitle(
      'Add address and contact details - Import notification service - GOV.UK'
    )
    await expect(page.getByText('Draft', { exact: true })).toBeVisible()
    await expect(
      page.getByText(JOURNEY_HANDSHAKES_BY_ROLE.consignor['notification-id'], {
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByText('Add new address', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Add address and contact details'
      })
    ).toBeVisible()
    const sectionHeadings = ['Address', 'Contact details'].map((name) =>
      page.getByRole('heading', { level: 2, name, exact: true })
    )
    for (const sectionHeading of sectionHeadings) {
      await expect(sectionHeading).toBeVisible()
    }
    await expect(
      page.getByLabel(fieldLabels.name, { exact: true })
    ).toBeVisible()
    await expect(page.getByLabel(fieldLabels.county)).toBeVisible()

    const strip = await page.locator('.app-journey-strip').boundingBox()
    const belowTheStrip = [
      page.getByText('Add new address', { exact: true }),
      page.getByRole('heading', { level: 1 }),
      ...sectionHeadings,
      page.getByLabel(fieldLabels.name, { exact: true }),
      page.getByLabel(fieldLabels.county)
    ]
    for (const element of belowTheStrip) {
      const { y } = await element.boundingBox()
      expect(y).toBeGreaterThanOrEqual(strip.y + strip.height)
    }
  })

  test('gives each personal-data field its browser autocomplete hint', async ({
    page
  }) => {
    await openFromJourney(page, 'stub-org-add-journey-autocomplete')

    for (const [field, autocomplete] of Object.entries(AUTOCOMPLETE_BY_FIELD)) {
      await expect(page.getByLabel(fieldLabels[field])).toHaveAttribute(
        'autocomplete',
        autocomplete
      )
    }
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openFromJourney(page, 'stub-org-add-journey-axe')

    await expectNoSeriousOrCriticalViolations(page, 'Add address from journey')
  })

  test('from the consignee handshake offers United Kingdom alone, selected, with every field shown', async ({
    page
  }) => {
    await openFromJourney(
      page,
      'stub-org-add-journey-consignee',
      JOURNEY_HANDSHAKES_BY_ROLE.consignee
    )

    const country = page.getByLabel('Country')
    await expect(country.getByRole('option')).toHaveText([GB_COUNTRY.name])
    await expect(country).toHaveValue('GB')
    for (const label of Object.values(fieldLabels)) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
  })

  for (const [role, roleName] of [
    ['placeOfOrigin', 'place of origin'],
    ['consignor', 'consignor']
  ]) {
    test(`from the ${roleName} handshake opens the Country select on Select a country and offers every captured country, alphabetically, as a plain select`, async ({
      page
    }) => {
      await openFromJourney(
        page,
        `stub-org-add-journey-countries-${role}`,
        JOURNEY_HANDSHAKES_BY_ROLE[role]
      )

      const country = page.getByLabel('Country')
      await expect(country).toHaveJSProperty('tagName', 'SELECT')
      await expect(country).toHaveValue('')
      await expect(country.getByRole('option')).toHaveText([
        COUNTRY_PLACEHOLDER,
        ...addressFormCountryNames
      ])
    })
  }

  test('from the consignee handshake a blank name links to the name field and the error page has no serious or critical axe violations', async ({
    page
  }) => {
    await openFromJourney(
      page,
      'stub-org-add-journey-consignee-name',
      JOURNEY_HANDSHAKES_BY_ROLE.consignee
    )

    await fillValidAddress(page, { name: '' })
    await submit(page)

    await expectErrorFocusOn(page, {
      message: 'Enter a name or organisation',
      label: fieldLabels.name,
      expectedValue: '',
      url: (url) => url.pathname === addressAddPath()
    })
    await expectNoSeriousOrCriticalViolations(
      page,
      'Add address from journey validation error'
    )
  })
})

test.describe('add address validation', () => {
  for (const [field, label, error] of requiredValidations) {
    test(`empty ${label} links to and focuses the preserved field`, async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-add-required' })
      await page.goto(addressAddPath())

      await fillValidAddress(page, { [field]: '' })
      await submit(page)

      await expectErrorFocusOn(page, {
        message: error,
        label,
        expectedValue: '',
        url: addressAddPath()
      })
      await expect(page.getByLabel(fieldLabels.name)).toHaveValue(
        field === 'name' ? '' : validAddress.name
      )
    })
  }

  for (const [field, label, maxLength, error] of maxLengthValidations) {
    test(`${label} over ${maxLength} characters links to and focuses the preserved value`, async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-add-maxlength' })
      await page.goto(addressAddPath())

      const value = 'A'.repeat(maxLength + 1)
      await fillValidAddress(page, { [field]: value })
      await submit(page)

      await expectErrorFocusOn(page, {
        message: error,
        label,
        expectedValue: value,
        url: addressAddPath()
      })
      await expect(page.getByLabel(fieldLabels.name)).toHaveValue(
        field === 'name' ? value : validAddress.name
      )
    })
  }

  test('rejects a malformed email address', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-email' })
    await page.goto(addressAddPath())

    await fillValidAddress(page, { email: 'not-an-email' })
    await submit(page)

    await expectErrorFocusOn(page, {
      message: 'Enter an email address in the correct format',
      label: fieldLabels.email,
      expectedValue: 'not-an-email',
      url: addressAddPath()
    })
  })

  test('validation error page has no serious or critical axe violations', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-add-validation-axe' })
    await page.goto(addressAddPath())

    await fillValidAddress(page, { name: '' })
    await submit(page)
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Add address validation error'
    )
  })
})

test.describe('save and confirm', () => {
  const organisationPrefix = 'stub-org-add-save'

  test('saves a valid address and keeps the Success banner naming it showing 10 seconds after the list loads', async ({
    page
  }) => {
    await page.clock.install()
    await addValidAddressToFreshOrganisation(page, { organisationPrefix })

    const banner = page
      .getByRole('alert', { name: 'Success' })
      .getByText(`${validAddress.name} address added to your address book`, {
        exact: true
      })
    await expect(banner).toBeVisible()
    await page.clock.runFor(10_000)
    await expect(banner).toBeVisible()
  })

  test('lists the saved address first, ahead of the seeded address, with a View link to its own details page', async ({
    page
  }) => {
    const nameAfterSeedAlphabetically = 'Zetland Livestock Ltd'
    await addValidAddressToFreshOrganisation(page, {
      organisationPrefix,
      overrides: { name: nameAfterSeedAlphabetically }
    })

    await expect(resultsLineOf(page)).toHaveText('Showing 1-2 of 2')
    await expect(page.getByRole('link', { name: /^View / })).toHaveText([
      `View ${nameAfterSeedAlphabetically}`,
      `View ${seedAddress.name}`
    ])
    const viewLink = page.getByRole('link', {
      name: `View ${nameAfterSeedAlphabetically}`
    })
    await expect(viewLink).toHaveAttribute(
      'href',
      new RegExp(`^${addressBookPath()}/[0-9a-f]{24}$`)
    )
    await viewLink.click()
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: nameAfterSeedAlphabetically
      })
    ).toBeVisible()
  })

  test('finds the saved address by its name, a fragment of its address and part of its country name', async ({
    page
  }) => {
    await addValidAddressToFreshOrganisation(page, {
      organisationPrefix,
      overrides: { countryCode: 'FR' }
    })

    for (const term of [validAddress.name, 'drover', 'fran']) {
      await searchAndExpectSingleMatch(page, term, {
        matchedCellText: validAddress.name
      })
    }
  })

  test('lists the saved address with each stored line on its own line, each but the last ending in a comma, and its country apart', async ({
    page
  }) => {
    await addValidAddressToFreshOrganisation(page, { organisationPrefix })

    const table = page.getByRole('table')
    await expect(
      table.getByRole('cell', { name: validAddress.name, exact: true })
    ).toBeVisible()
    const storedLines = [
      validAddress.addressLine1,
      validAddress.addressLine2,
      validAddress.townOrCity,
      validAddress.county,
      validAddress.postcode
    ]
    const addressCell = table.getByRole('cell', {
      name: `${validAddress.addressLine1},`
    })
    await expect(addressCell).toHaveText(
      new RegExp(`^${storedLines.join(',\n')}$`),
      { useInnerText: true }
    )
    await expect(
      table
        .getByRole('row', { name: new RegExp(validAddress.name) })
        .getByRole('cell', { name: GB_COUNTRY.name, exact: true })
    ).toBeVisible()
  })
})

test.describe('cancel', () => {
  test('returns to the address book without creating an address', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-add-cancel' })
    await page.goto(addressAddPath())

    await fillValidAddress(page)

    await page
      .getByRole('link', { name: 'Cancel and return to address book' })
      .click()

    await expect(page).toHaveURL(addressBookPath())
    await expect(resultsLineOf(page)).toHaveText('Showing 1-1 of 1')
    await expect(
      page.getByRole('link', { name: `View ${seedAddress.name}` })
    ).toBeVisible()
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(2)
  })
})
