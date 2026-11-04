import { test, expect } from '@playwright/test'

import {
  addValidAddressToFreshOrganisation,
  addressFormCountryNames,
  errorLink,
  expectErrorFocusOn,
  expectInDocumentOrder,
  openAddForm,
  openAddFormFromJourney,
  fieldLabels,
  fieldLabelsInFormOrder,
  fillValidAddress,
  maxLengthValidations,
  originOrConsignorListUrl,
  requiredValidations,
  setFieldValue,
  tickUses,
  validAddress
} from './address-form.js'
import {
  resultsLineOf,
  searchAndExpectSingleMatch,
  selectedTabOf
} from './address-book-list.js'
import { copy } from '../copy/copy.en.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { GB_COUNTRY } from '../address-countries.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import { seedAddress } from './seed-address.js'
import {
  addressAddPath,
  addressBookPath,
  addressTypePath
} from '../../../shared/paths.js'
import { signIn } from '../../../../../../fit/sign-in.js'
import { AUTOCOMPLETE_BY_FIELD } from '../../../../common/test-helpers/address-form-autocomplete.js'
import {
  CONSIGNMENT_CONTACT_HANDSHAKE,
  JOURNEY_HANDSHAKES_BY_ROLE,
  returnUrlFor,
  USES_BY_ROLE
} from '../../../../common/test-helpers/journey-handshake.js'
import { JOURNEY_STRIP } from '../../../../common/test-helpers/journey-strip.js'
import { COUNTRY_PLACEHOLDER } from '../../../../common/test-helpers/country-placeholder.js'
import { ADDRESS_LANDING } from '../journey-registry.js'
import { addressBookPageHref } from '../view-model/list.js'

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const LATE_ALPHABETICAL_NAME = 'Zetland Livestock Ltd'

const usesGroupOf = (page, addressType) =>
  page.getByRole('group', {
    name: copy.uses.legendByAddressType[addressType]
  })

test.describe('add address', () => {
  test('renders every field, hints and populated country options', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-add-render' })
    await openAddForm(page)

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
    await expect(country).toHaveValue(GB_COUNTRY.code)
    await expect(country.getByRole('option').first()).toHaveText(
      COUNTRY_PLACEHOLDER
    )
    await expect(
      country.getByRole('option', { name: GB_COUNTRY.name })
    ).toHaveCount(1)
  })

  test('has a Back link to Choose an address type', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-back' })
    await openAddForm(page)

    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', addressTypePath())
  })

  test('groups fields under Address and Contact details', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-sections' })
    await openAddForm(page)

    for (const name of ['Address', 'Contact details']) {
      await expect(
        page.getByRole('heading', { level: 2, name, exact: true })
      ).toBeVisible()
    }
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signIn(page, { organisationId: 'stub-org-add-axe' })
    await openAddForm(page)

    await expectNoSeriousOrCriticalViolations(page, 'Add address')
  })
})

test.describe('add address uses question', () => {
  const organisationPrefix = 'stub-org-add-uses'

  test('follows the contact fields with a section break, the legend, the hint and Place of origin then Consignor, unticked', async ({
    page
  }) => {
    await signIn(page, { organisationId: `${organisationPrefix}-render` })
    await openAddForm(page)

    const sectionBreak = page.locator('hr.govuk-section-break--visible')
    await expect(sectionBreak).toHaveCount(1)
    const usesGroup = usesGroupOf(page, ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR)
    await expect(usesGroup).toBeVisible()
    await expectInDocumentOrder(page, [
      page.getByLabel(fieldLabels.phone),
      sectionBreak,
      usesGroup
    ])
    await expect(usesGroup).toContainText(copy.uses.hint)
    const options = usesGroup.getByRole('checkbox')
    await expect(options).toHaveCount(2)
    await expect(usesGroup.locator('label')).toHaveText([
      copy.uses.options.PLACE_OF_ORIGIN.label,
      copy.uses.options.CONSIGNOR.label
    ])
    await expect(
      usesGroup.getByRole('checkbox', { checked: true })
    ).toHaveCount(0)
  })

  test('saving valid fields with no use shows the uses error, whose summary link focuses Place of origin, and the error page has no serious or critical axe violations', async ({
    page
  }) => {
    await signIn(page, { organisationId: `${organisationPrefix}-error` })
    await openAddForm(page)

    await fillValidAddress(page)
    await submit(page)

    await expect(page).toHaveTitle(/^Error: /)
    await expect(page.getByRole('alert')).toContainText('There is a problem')
    await expect(
      usesGroupOf(page, ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR)
    ).toContainText(copy.errors.uses.required)
    await errorLink(page, copy.errors.uses.required).click()
    await expect(
      page.getByRole('checkbox', {
        name: copy.uses.options.PLACE_OF_ORIGIN.label,
        exact: true
      })
    ).toBeFocused()
    await expectNoSeriousOrCriticalViolations(page, 'Add address uses error')
  })

  test('saving with Place of origin ticked lands on the Origin and Consignor list with the new address first', async ({
    page
  }) => {
    await addValidAddressToFreshOrganisation(page, {
      organisationPrefix,
      overrides: { name: LATE_ALPHABETICAL_NAME }
    })

    await expect(selectedTabOf(page)).toHaveText(
      copy.list.tabs.originOrConsignor.label
    )
    await expect(page.getByRole('link', { name: /^View / }).first()).toHaveText(
      `View ${LATE_ALPHABETICAL_NAME}`
    )
  })

  test('finds an address saved with Consignor ticked by searching Consignor', async ({
    page
  }) => {
    await signIn(page, { organisationId: `${organisationPrefix}-search` })
    await openAddForm(page)
    await fillValidAddress(page)
    await tickUses(page, ['CONSIGNOR'])
    await submit(page)
    await expect(page).toHaveURL(originOrConsignorListUrl)

    await searchAndExpectSingleMatch(page, 'Consignor', {
      matchedCellText: validAddress.name
    })
  })
})

test.describe('add address uses question without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('saves with a use ticked and lands on the Origin and Consignor list with the address listed', async ({
    page
  }) => {
    await addValidAddressToFreshOrganisation(page, {
      organisationPrefix: 'stub-org-add-uses-no-js'
    })

    await expect(selectedTabOf(page)).toHaveText(
      copy.list.tabs.originOrConsignor.label
    )
    await expect(
      page.getByRole('link', { name: `View ${validAddress.name}` })
    ).toBeVisible()
  })
})

test.describe('add address of a type that must be in the United Kingdom', () => {
  const organisationPrefix = 'stub-org-add-uk-only'

  for (const { addressType, offeredUses, tab } of [
    {
      addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
      offeredUses: ['PLACE_OF_DESTINATION', 'CONSIGNEE', 'IMPORTER'],
      tab: copy.list.tabs.destinationConsigneeOrImporter.label
    },
    {
      addressType: ADDRESS_TYPES.BRANCH,
      offeredUses: ['BRANCH_ADDRESS'],
      tab: copy.list.tabs.branch.label
    }
  ]) {
    const typeLabel = copy.addressType.options[addressType].label

    test(`${typeLabel} opens with the address and contact fields, a section break, then the uses question, and United Kingdom alone selected`, async ({
      page
    }) => {
      await signIn(page, { organisationId: `${organisationPrefix}-render` })
      await openAddForm(page, addressType)

      await expect(
        page.locator('label.govuk-label:not(.govuk-checkboxes__label)')
      ).toHaveText(fieldLabelsInFormOrder)
      const sectionBreak = page.locator('hr.govuk-section-break--visible')
      await expect(sectionBreak).toHaveCount(1)
      const usesGroup = usesGroupOf(page, addressType)
      await expect(usesGroup).toBeVisible()
      await expectInDocumentOrder(page, [
        page.getByLabel(fieldLabels.phone),
        sectionBreak,
        usesGroup
      ])
      await expect(usesGroup).toContainText(copy.uses.hint)
      await expect(usesGroup.locator('label')).toHaveText(
        offeredUses.map((use) => copy.uses.options[use].label)
      )
      await expect(
        usesGroup.getByRole('checkbox', { checked: true })
      ).toHaveCount(0)
      const country = page.getByLabel(fieldLabels.countryCode)
      await expect(country.getByRole('option')).toHaveText([GB_COUNTRY.name])
      await expect(country).toHaveValue(GB_COUNTRY.code)
    })

    test(`${typeLabel} saved with every offered use ticked lands on its tab with the new address first`, async ({
      page
    }) => {
      await addValidAddressToFreshOrganisation(page, {
        organisationPrefix,
        overrides: { name: LATE_ALPHABETICAL_NAME },
        addressType,
        uses: offeredUses
      })

      await expect(selectedTabOf(page)).toHaveText(tab)
      await expect(
        page.getByRole('link', { name: /^View / }).first()
      ).toHaveText(`View ${LATE_ALPHABETICAL_NAME}`)
    })

    test(`${typeLabel} saved with no use shows the uses error, whose summary link focuses the first option`, async ({
      page
    }) => {
      await signIn(page, { organisationId: `${organisationPrefix}-no-use` })
      await openAddForm(page, addressType)

      await fillValidAddress(page)
      await submit(page)

      await expect(usesGroupOf(page, addressType)).toContainText(
        copy.errors.uses.required
      )
      await errorLink(page, copy.errors.uses.required).click()
      await expect(
        page.getByRole('checkbox', {
          name: copy.uses.options[offeredUses[0]].label,
          exact: true
        })
      ).toBeFocused()
    })
  }

  test('Destination, Consignee or Importer form has no serious or critical axe violations', async ({
    page
  }) => {
    await signIn(page, { organisationId: `${organisationPrefix}-axe` })
    await openAddForm(page, ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER)

    await expectNoSeriousOrCriticalViolations(page, 'Add Destination address')
  })
})

test.describe('add address reached from a notification journey', () => {
  test('shows the Draft status and notification id above the caption, heading, section headings and fields', async ({
    page
  }) => {
    await openAddFormFromJourney(page, 'stub-org-add-journey')

    await expect(page).toHaveTitle(
      'Add address and contact details - Import notification service - GOV.UK'
    )
    const journeyStrip = page.locator(JOURNEY_STRIP)
    await expect(journeyStrip.getByText('Draft', { exact: true })).toBeVisible()
    await expect(
      journeyStrip.getByText(
        JOURNEY_HANDSHAKES_BY_ROLE.consignor['notification-id'],
        { exact: true }
      )
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

    const strip = await journeyStrip.boundingBox()
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
    await openAddFormFromJourney(page, 'stub-org-add-journey-autocomplete')

    for (const [field, autocomplete] of Object.entries(AUTOCOMPLETE_BY_FIELD)) {
      await expect(page.getByLabel(fieldLabels[field])).toHaveAttribute(
        'autocomplete',
        autocomplete
      )
    }
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openAddFormFromJourney(page, 'stub-org-add-journey-axe')

    await expectNoSeriousOrCriticalViolations(page, 'Add address from journey')
  })

  test('from the consignee handshake offers United Kingdom alone, selected, with every field shown', async ({
    page
  }) => {
    await openAddFormFromJourney(
      page,
      'stub-org-add-journey-consignee',
      JOURNEY_HANDSHAKES_BY_ROLE.consignee
    )

    const country = page.getByLabel('Country')
    await expect(country.getByRole('option')).toHaveText([GB_COUNTRY.name])
    await expect(country).toHaveValue(GB_COUNTRY.code)
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
      await openAddFormFromJourney(
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
    await openAddFormFromJourney(
      page,
      'stub-org-add-journey-consignee-name',
      JOURNEY_HANDSHAKES_BY_ROLE.consignee
    )

    await fillValidAddress(page, { name: '' })
    await page.getByRole('button', { name: copy.add.saveAndSelect }).click()

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

  test(`from a role handshake offers Back to the journey, ${copy.add.saveAndSelect}, ${copy.add.saveAndReturnToAddressPage} and a Cancel and return to hub link`, async ({
    page
  }) => {
    await openAddFormFromJourney(page, 'stub-org-add-journey-actions')

    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute(
      'href',
      returnUrlFor(JOURNEY_HANDSHAKES_BY_ROLE.consignor)
    )
    await expect(page.locator('form button')).toHaveText([
      copy.add.saveAndSelect,
      copy.add.saveAndReturnToAddressPage
    ])
    await expect(
      page.getByRole('link', { name: 'Cancel and return to hub' })
    ).toHaveAttribute(
      'href',
      returnUrlFor(JOURNEY_HANDSHAKES_BY_ROLE.consignor, {
        landing: ADDRESS_LANDING.CANCEL
      })
    )
  })

  test('from the consignment contact handshake offers Back to the journey, Save and continue and Cancel and return to address page', async ({
    page
  }) => {
    await openAddFormFromJourney(
      page,
      'stub-org-add-journey-contact',
      CONSIGNMENT_CONTACT_HANDSHAKE
    )

    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', returnUrlFor(CONSIGNMENT_CONTACT_HANDSHAKE))
    await expect(page.locator('form button')).toHaveText([
      'Save and continue',
      'Cancel and return to address page'
    ])
  })
})

test.describe('add address uses question reached from a notification journey', () => {
  for (const [role, { ownUse, article, otherUses }] of Object.entries(
    USES_BY_ROLE
  )) {
    test(`from the ${role} handshake asks what else the address should be used for, naming the role and offering only the other uses on its side, unticked`, async ({
      page
    }) => {
      await openAddFormFromJourney(
        page,
        `stub-org-add-journey-uses-${role}`,
        JOURNEY_HANDSHAKES_BY_ROLE[role]
      )

      const usesGroup = page.getByRole('group', {
        name: copy.uses.journeyLegend
      })
      await expect(usesGroup).toHaveAccessibleDescription(
        `This address is being added as ${article} ${copy.uses.options[ownUse].label} address. Select any other roles or addresses this address should be used for.`
      )
      await expect(usesGroup.locator('label')).toHaveText(
        otherUses.map((use) => copy.uses.options[use].label)
      )
      for (const checkbox of await usesGroup.getByRole('checkbox').all()) {
        await expect(checkbox).not.toBeChecked()
      }
    })
  }

  test(`${copy.add.saveAndReturnToAddressPage} with answers missing keeps the page, lists the errors in field order and keeps the tick`, async ({
    page
  }) => {
    await openAddFormFromJourney(
      page,
      'stub-org-add-journey-return-blank',
      JOURNEY_HANDSHAKES_BY_ROLE.consignee
    )

    await setFieldValue(page, 'name', validAddress.name)
    await tickUses(page, ['IMPORTER'])
    await page
      .getByRole('button', { name: copy.add.saveAndReturnToAddressPage })
      .click()

    await expect(page).toHaveURL((url) => url.pathname === addressAddPath())
    await expect(page.getByRole('alert').getByRole('link')).toHaveText([
      'Enter address line 1',
      'Enter a town or city',
      'Enter a postcode or Zip code',
      'Enter an email address',
      'Enter a phone number'
    ])
    await expect(page.getByLabel(fieldLabels.name)).toHaveValue(
      validAddress.name
    )
    await expect(
      page.getByRole('checkbox', { name: 'Importer', exact: true })
    ).toBeChecked()
  })
})

test.describe('add address reached from a notification journey with JavaScript off', () => {
  test.use({ javaScriptEnabled: false })

  test('Save and select with Importer ticked on the consignee page lists the address under the Consignee and Importer uses', async ({
    page
  }) => {
    await page.route('http://localhost:3000/**', (route) => route.abort())
    await openAddFormFromJourney(
      page,
      `stub-org-add-journey-ticked-${crypto.randomUUID()}`,
      JOURNEY_HANDSHAKES_BY_ROLE.consignee
    )
    await fillValidAddress(page)
    await tickUses(page, ['IMPORTER'])
    const journeyReturn = page.waitForRequest((request) =>
      request.url().includes('/address-return')
    )
    await page.getByRole('button', { name: copy.add.saveAndSelect }).click()

    const returnUrl = new URL((await journeyReturn).url())
    expect(returnUrl.searchParams.get('addressId')).toBeTruthy()
    expect(returnUrl.searchParams.get('landing')).toBe(ADDRESS_LANDING.SELECT)

    const listPage = await page.context().newPage()
    await listPage.goto(
      addressBookPageHref(1, {
        addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
      })
    )
    await expect(
      listPage
        .getByRole('row', { name: new RegExp(validAddress.name) })
        .getByRole('cell')
        .nth(1)
    ).toHaveText('Consignee, Importer')
  })
})

test.describe('add address validation', () => {
  for (const [field, label, error] of requiredValidations) {
    test(`empty ${label} links to and focuses the preserved field`, async ({
      page
    }) => {
      await signIn(page, { organisationId: 'stub-org-add-required' })
      await openAddForm(page)

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
      await openAddForm(page)

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
    await openAddForm(page)

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
    await openAddForm(page)

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
    const nameAfterSeedAlphabetically = LATE_ALPHABETICAL_NAME
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
    await openAddForm(page)

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
