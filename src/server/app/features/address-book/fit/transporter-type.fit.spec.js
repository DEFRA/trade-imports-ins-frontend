import { expect, test } from '@playwright/test'

import { signInAndOpen } from '../../../../../../fit/sign-in.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import { TRANSPORTER_TYPES } from '../../../services/transporters/index.js'
import { addressTypePath } from '../../../shared/paths.js'
import { copy } from '../copy/copy.en.js'
import {
  openFilterDisclosure,
  resultsLineOf,
  searchFieldOf
} from './address-book-list.js'
import { backLink, chooseAddressType } from './address-form.js'
import {
  chooseTransporterType,
  fillPrivateTransporterForm,
  openTransporterTypePage,
  privateTransporterPath,
  commercialTransporterPath,
  saveTransporterButton,
  transporterContinueButton,
  transporterTypePath,
  transporterTypeRadio,
  validPrivateTransporter
} from './transporter-form.js'
import { expectNoSeriousOrCriticalViolations } from '../../../../../../fit/axe.js'

const { transporterType: typeCopy, errors } = copy

const typePageHeading = (page) =>
  page.getByRole('heading', { level: 1, name: typeCopy.title })

test.describe('choose a transporter type', () => {
  test('opens with the caption, heading, warning, both options with the commercial hint, Continue, and Back to the address type question', async ({
    page
  }) => {
    await openTransporterTypePage(page, 'stub-org-transporter-type-render')

    await expect(
      page.getByText(typeCopy.caption, { exact: true })
    ).toBeVisible()
    await expect(typePageHeading(page)).toBeVisible()
    await expect(page.getByText(typeCopy.warning)).toBeVisible()
    const radios = page.getByRole('radio')
    await expect(radios).toHaveCount(2)
    await expect(
      transporterTypeRadio(page, TRANSPORTER_TYPES.PRIVATE)
    ).toHaveAccessibleName(typeCopy.options.PRIVATE.label)
    await expect(
      transporterTypeRadio(page, TRANSPORTER_TYPES.COMMERCIAL)
    ).toHaveAccessibleDescription(typeCopy.options.COMMERCIAL.hint)
    await expect(transporterContinueButton(page)).toBeVisible()
    await expect(backLink(page)).toHaveAttribute('href', addressTypePath())
    await expectNoSeriousOrCriticalViolations(page, 'Choose a transporter type')
  })

  test('choosing Transporter on the address type question hands over to the transporter type question', async ({
    page
  }) => {
    await signInAndOpen(
      page,
      'stub-org-transporter-hand-over',
      addressTypePath()
    )

    await chooseAddressType(page, ADDRESS_TYPES.TRANSPORTER)

    await expect(page).toHaveURL(transporterTypePath())
    await expect(typePageHeading(page)).toBeVisible()
  })

  test('Continue with nothing chosen shows the problem summary and the inline error, and the summary link focuses the first option', async ({
    page
  }) => {
    await signInAndOpen(
      page,
      'stub-org-transporter-type-error',
      transporterTypePath()
    )

    await transporterContinueButton(page).click()

    const summary = page.getByRole('alert')
    await expect(summary.getByRole('heading')).toHaveText('There is a problem')
    await expect(
      page.getByRole('group', { name: typeCopy.title })
    ).toContainText(errors.transporterType.required)
    await expectNoSeriousOrCriticalViolations(
      page,
      'Choose a transporter type with an error'
    )
    await summary
      .getByRole('link', { name: errors.transporterType.required, exact: true })
      .click()
    await expect(
      transporterTypeRadio(page, TRANSPORTER_TYPES.PRIVATE)
    ).toBeFocused()
  })

  test('Private opens the private form and Commercial the commercial form', async ({
    page
  }) => {
    await openTransporterTypePage(page, 'stub-org-transporter-type-private')
    await chooseTransporterType(page, TRANSPORTER_TYPES.PRIVATE)
    await expect(page).toHaveURL(privateTransporterPath())

    await openTransporterTypePage(page, 'stub-org-transporter-type-commercial')
    await chooseTransporterType(page, TRANSPORTER_TYPES.COMMERCIAL)
    await expect(page).toHaveURL(commercialTransporterPath())
  })
})

test.describe('the transporter type question and the Transporter tab search without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('refuses Continue with nothing chosen, then choosing Private opens the private form', async ({
    page
  }) => {
    await openTransporterTypePage(page, 'stub-org-transporter-type-no-js')

    await transporterContinueButton(page).click()

    await expect(
      page.getByRole('group', { name: typeCopy.title })
    ).toContainText(errors.transporterType.required)

    await chooseTransporterType(page, TRANSPORTER_TYPES.PRIVATE)

    await expect(page).toHaveURL(privateTransporterPath())
  })

  test('saving a private transporter and searching the Transporter tab for it both work as plain form posts', async ({
    page
  }) => {
    await openTransporterTypePage(page, 'stub-org-transporter-no-js-search')
    await chooseTransporterType(page, TRANSPORTER_TYPES.PRIVATE)
    await fillPrivateTransporterForm(page)

    await saveTransporterButton(page, copy.privateTransporterForm).click()

    await expect(
      page.getByText(
        `${validPrivateTransporter.name} added to your address book`
      )
    ).toBeVisible()

    await openFilterDisclosure(page)
    await searchFieldOf(page).fill(validPrivateTransporter.name)
    await page.getByRole('button', { name: 'Search', exact: true }).click()

    await expect(resultsLineOf(page)).toHaveText('Showing 1-1 of 1')
    await expect(
      page.getByRole('cell', {
        name: validPrivateTransporter.name,
        exact: true
      })
    ).toBeVisible()
  })
})
