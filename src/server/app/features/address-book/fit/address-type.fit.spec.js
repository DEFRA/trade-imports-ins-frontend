import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../fit/sign-in.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import {
  addressAddPath,
  addressBookPath,
  addressTypePath
} from '../../../shared/paths.js'
import { GB_COUNTRY } from '../address-countries.js'
import { copy } from '../copy/copy.en.js'
import { COUNTRY_PLACEHOLDER } from '../../../../common/test-helpers/country-placeholder.js'
import { JOURNEY_STRIP } from '../../../../common/test-helpers/journey-strip.js'
import {
  addressTypeRadio,
  addValidAddressToFreshOrganisation,
  backLink,
  chooseAddressType,
  fieldLabels,
  fieldLabelsInFormOrder,
  malformedEmail,
  openAddForm,
  refuseSaveThenReopenAddForm,
  useCheckbox,
  validAddress
} from './address-form.js'
import { openAddressBookList } from './address-book-list.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'

const { addressType: typeCopy, errors } = copy
const ADDRESS_TYPE_VALUES = Object.values(ADDRESS_TYPES)

const typePageHeading = (page) =>
  page.getByRole('heading', { level: 1, name: typeCopy.title })

const addFormHeading = (page) =>
  page.getByRole('heading', { level: 1, name: copy.add.title })

const continueButton = (page) =>
  page.getByRole('button', { name: typeCopy.continue })

const addressTypeErrorMessage = (page) =>
  page.locator('.govuk-error-message').getByText(errors.addressType.required)

const openTypePageFromList = async (page, organisationId) => {
  await openAddressBookList(page, { organisationId })
  await page.getByRole('button', { name: copy.list.add }).click()
}

const expectNoTypeChosen = async (page) => {
  for (const addressType of ADDRESS_TYPE_VALUES) {
    await expect(addressTypeRadio(page, addressType)).not.toBeChecked()
  }
}

test.describe('choose an address type', () => {
  test('opens from Add a new address with the caption, heading, the three types and their hints in order, and Back to the address book', async ({
    page
  }) => {
    await openTypePageFromList(page, 'stub-org-type-render')

    await expect(page.locator('.govuk-caption-l')).toHaveText(typeCopy.caption)
    await expect(typePageHeading(page)).toBeVisible()
    await expect(page.locator('.govuk-radios__label')).toHaveText(
      ADDRESS_TYPE_VALUES.map(
        (addressType) => typeCopy.options[addressType].label
      )
    )
    await expect(page.locator('.govuk-radios__hint')).toHaveText(
      ADDRESS_TYPE_VALUES.map(
        (addressType) => typeCopy.options[addressType].hint
      )
    )
    await expect(continueButton(page)).toBeVisible()
    await expect(backLink(page)).toHaveAttribute('href', addressBookPath())
    await expectNoTypeChosen(page)
    await expectNoSeriousOrCriticalViolations(page, 'Choose an address type')
  })

  test('Continue with nothing chosen shows the problem summary and the inline error, and the summary link focuses the first type', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-type-error' })
    await page.goto(addressTypePath())

    await continueButton(page).click()

    const summary = page.getByRole('alert')
    await expect(summary.getByRole('heading')).toHaveText('There is a problem')
    await expect(addressTypeErrorMessage(page)).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Choose an address type with an error'
    )
    await summary
      .getByRole('link', { name: errors.addressType.required, exact: true })
      .click()
    await expect(
      addressTypeRadio(page, ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR)
    ).toBeFocused()
  })

  test('Origin or Consignor opens the address form with United Kingdom selected, Back shows it chosen and a new add starts with none chosen', async ({
    page
  }) => {
    await openTypePageFromList(page, 'stub-org-type-origin')

    await chooseAddressType(page, ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR)

    await expect(page).toHaveURL(addressAddPath())
    await expect(page.locator('.govuk-caption-l')).toHaveText(copy.add.caption)
    await expect(addFormHeading(page)).toBeVisible()
    await expect(page.locator(JOURNEY_STRIP)).toHaveCount(0)
    const country = page.getByLabel(fieldLabels.countryCode)
    await expect(country).toHaveValue(GB_COUNTRY.code)
    await expect(country.getByRole('option').first()).toHaveText(
      COUNTRY_PLACEHOLDER
    )

    await backLink(page).click()

    await expect(page).toHaveURL(addressTypePath())
    await expect(
      addressTypeRadio(page, ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR)
    ).toBeChecked()

    await page.goto(addressBookPath())
    await page.getByRole('button', { name: copy.list.add }).click()

    await expectNoTypeChosen(page)
  })

  for (const addressType of [
    ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
    ADDRESS_TYPES.BRANCH
  ]) {
    test(`${typeCopy.options[addressType].label} opens the address form and Back shows it chosen`, async ({
      page
    }) => {
      await signIn(page, { organisationId: `stub-org-type-${addressType}` })
      await page.goto(addressTypePath())

      await chooseAddressType(page, addressType)

      await expect(page).toHaveURL(addressAddPath())
      await expect(addFormHeading(page)).toBeVisible()

      await backLink(page).click()

      await expect(addressTypeRadio(page, addressType)).toBeChecked()
    })
  }

  test('opening the address form with no type chosen lands on Choose an address type', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-type-guard' })

    await page.goto(addressAddPath())

    await expect(page).toHaveURL(addressTypePath())
    await expect(typePageHeading(page)).toBeVisible()
  })

  test('after an address is saved the next add starts with no type chosen and empty text fields', async ({
    page
  }) => {
    await addValidAddressToFreshOrganisation(page, {
      organisationPrefix: 'stub-org-type-saved'
    })
    await page.getByRole('button', { name: copy.list.add }).click()

    await expectNoTypeChosen(page)

    await chooseAddressType(page)

    for (const label of fieldLabelsInFormOrder) {
      if (label !== fieldLabels.countryCode) {
        await expect(page.getByLabel(label)).toHaveValue('')
      }
    }
  })
})

const USE_TO_TICK_BY_ADDRESS_TYPE = {
  [ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR]: 'PLACE_OF_ORIGIN',
  [ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER]: 'CONSIGNEE',
  [ADDRESS_TYPES.BRANCH]: 'BRANCH_ADDRESS'
}

const expectEnteredAddressKept = async (page, use) => {
  const entered = { ...validAddress, email: malformedEmail }
  for (const [field, value] of Object.entries(entered)) {
    await expect(page.getByLabel(fieldLabels[field])).toHaveValue(value)
  }
  await expect(useCheckbox(page, use)).toBeChecked()
}

const expectRefusedEntryKeptOnReturn = async (
  page,
  addressType,
  organisationId
) => {
  const use = USE_TO_TICK_BY_ADDRESS_TYPE[addressType]
  await signIn(page, { organisationId })

  await refuseSaveThenReopenAddForm(page, { addressType, use })

  await expectEnteredAddressKept(page, use)
}

test.describe('going back from the address form to choose an address type', () => {
  for (const addressType of Object.keys(USE_TO_TICK_BY_ADDRESS_TYPE)) {
    test(`after a refused save of ${typeCopy.options[addressType].label}, choosing it again shows the address, the contact details and the ticked use entered`, async ({
      page
    }) => {
      await expectRefusedEntryKeptOnReturn(
        page,
        addressType,
        `stub-org-type-kept-${addressType}`
      )
    })
  }
})

test.describe('choose an address type without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('after a refused save of Branch, choosing it again shows the address, the contact details and the ticked use entered', async ({
    page
  }) => {
    await expectRefusedEntryKeptOnReturn(
      page,
      ADDRESS_TYPES.BRANCH,
      'stub-org-type-kept-no-js'
    )
  })

  test('refuses Continue with nothing chosen, then opens the address form and Back shows the type chosen', async ({
    page
  }) => {
    await openTypePageFromList(page, 'stub-org-type-no-js')

    await continueButton(page).click()

    await expect(addressTypeErrorMessage(page)).toBeVisible()

    await openAddForm(page, ADDRESS_TYPES.BRANCH)
    await expect(addFormHeading(page)).toBeVisible()

    await backLink(page).click()

    await expect(addressTypeRadio(page, ADDRESS_TYPES.BRANCH)).toBeChecked()
  })
})
