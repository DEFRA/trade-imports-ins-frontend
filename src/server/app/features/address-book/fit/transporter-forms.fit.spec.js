import { expect, test } from '@playwright/test'

import { signInAndOpen } from '../../../../../../fit/sign-in.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import { copy } from '../copy/copy.en.js'
import { expectNoSeriousOrCriticalViolations } from '../../../../../../fit/axe.js'
import { backLink } from './address-form.js'
import {
  cancelTransporterButton,
  commercialTransporterPath,
  fillCommercialTransporterForm,
  fillPrivateTransporterForm,
  openCommercialTransporterForm,
  openPrivateTransporterForm,
  privateTransporterPath,
  saveTransporterButton,
  transporterTypePath,
  validCommercialTransporter,
  validPrivateTransporter
} from './transporter-form.js'
import {
  resultsLineOf,
  transporterApprovalNumberCellOf,
  transporterTypeCellOf
} from './address-book-list.js'

const addressBookPathPattern = new RegExp(
  `/address-book\\?addressType=${ADDRESS_TYPES.TRANSPORTER}$`
)

test.describe('the private transporter form', () => {
  test('shows its caption, heading, fields and Back to the transporter type question, with no serious or critical accessibility violations', async ({
    page
  }) => {
    await openPrivateTransporterForm(
      page,
      'stub-org-private-transporter-render'
    )

    await expect(
      page.getByText(copy.privateTransporterForm.caption, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: copy.privateTransporterForm.title
      })
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.privateTransporterForm.fields.name)
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.privateTransporterForm.fields.countryCode)
    ).toBeVisible()
    await expectNoSeriousOrCriticalViolations(page, 'Add a private transporter')

    await backLink(page).click()

    await expect(page).toHaveURL(transporterTypePath())
  })

  test('opening it with no transporter type chosen returns to the transporter type question', async ({
    page
  }) => {
    await signInAndOpen(
      page,
      'stub-org-private-transporter-guard',
      privateTransporterPath()
    )

    await expect(page).toHaveURL(transporterTypePath())
  })

  test('Cancel with values entered returns to the address book filtered to transporters, creating nothing', async ({
    page
  }) => {
    await openPrivateTransporterForm(
      page,
      'stub-org-private-transporter-cancel'
    )
    await fillPrivateTransporterForm(page)

    await cancelTransporterButton(page, copy.privateTransporterForm).click()

    await expect(page).toHaveURL(addressBookPathPattern)
    await expect(
      page.getByRole('cell', { name: validPrivateTransporter.name })
    ).toHaveCount(0)
  })

  test('a valid save shows the success banner and lists the transporter, carrying the not-applicable approval number', async ({
    page
  }) => {
    await openPrivateTransporterForm(page, 'stub-org-private-transporter-save')
    await fillPrivateTransporterForm(page)

    await saveTransporterButton(page, copy.privateTransporterForm).click()

    await expect(page).toHaveURL(addressBookPathPattern)
    await expect(
      page.getByText(
        `${validPrivateTransporter.name} added to your address book`
      )
    ).toBeVisible()
    await expect(
      transporterApprovalNumberCellOf(page, validPrivateTransporter.name)
    ).toHaveText(copy.notApplicable)
    await expect(
      transporterTypeCellOf(page, validPrivateTransporter.name)
    ).toHaveText(copy.list.transporterTypes.PRIVATE)
  })

  test('a blank name refuses the save with no serious or critical accessibility violations', async ({
    page
  }) => {
    await openPrivateTransporterForm(
      page,
      'stub-org-private-transporter-save-error'
    )
    await fillPrivateTransporterForm(page, { name: '' })

    await saveTransporterButton(page, copy.privateTransporterForm).click()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Add a private transporter with an error'
    )
  })
})

test.describe('the commercial transporter form', () => {
  test('shows its caption, heading, the fixed Northern Ireland country and the approval number field, with no serious or critical accessibility violations', async ({
    page
  }) => {
    await openCommercialTransporterForm(
      page,
      'stub-org-commercial-transporter-render'
    )

    await expect(
      page.getByText(copy.commercialTransporterForm.caption, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: copy.commercialTransporterForm.title
      })
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.commercialTransporterForm.fields.approvalNumber)
    ).toBeVisible()
    await expect(page.getByLabel('Country', { exact: true })).toHaveText(
      copy.commercialTransporterForm.country
    )
    await expectNoSeriousOrCriticalViolations(
      page,
      'Add a commercial transporter'
    )
  })

  test('opening it with no transporter type chosen returns to the transporter type question', async ({
    page
  }) => {
    await signInAndOpen(
      page,
      'stub-org-commercial-transporter-guard',
      commercialTransporterPath()
    )

    await expect(page).toHaveURL(transporterTypePath())
  })

  test('Cancel with values entered returns to the address book filtered to transporters, creating nothing', async ({
    page
  }) => {
    await openCommercialTransporterForm(
      page,
      'stub-org-commercial-transporter-cancel'
    )
    await fillCommercialTransporterForm(page)

    await cancelTransporterButton(page, copy.commercialTransporterForm).click()

    await expect(page).toHaveURL(addressBookPathPattern)
    await expect(
      page.getByRole('cell', { name: validCommercialTransporter.name })
    ).toHaveCount(0)
  })

  test('a valid save shows the success banner and lists the transporter with its approval number and type', async ({
    page
  }) => {
    await openCommercialTransporterForm(
      page,
      'stub-org-commercial-transporter-save'
    )
    await fillCommercialTransporterForm(page)

    await saveTransporterButton(page, copy.commercialTransporterForm).click()

    await expect(page).toHaveURL(addressBookPathPattern)
    await expect(
      page.getByText(
        `${validCommercialTransporter.name} added to your address book`
      )
    ).toBeVisible()
    await expect(
      transporterApprovalNumberCellOf(page, validCommercialTransporter.name)
    ).toHaveText(validCommercialTransporter.approvalNumber)
    await expect(
      transporterTypeCellOf(page, validCommercialTransporter.name)
    ).toHaveText(copy.list.transporterTypes.COMMERCIAL)
  })

  test('a missing approval number refuses the save with no serious or critical accessibility violations', async ({
    page
  }) => {
    await openCommercialTransporterForm(
      page,
      'stub-org-commercial-transporter-missing-approval'
    )
    await fillCommercialTransporterForm(page, { approvalNumber: '' })

    await saveTransporterButton(page, copy.commercialTransporterForm).click()

    await expect(page.getByRole('alert')).toContainText(
      copy.errors.approvalNumber.required
    )
    await expectNoSeriousOrCriticalViolations(
      page,
      'Add a commercial transporter with an error'
    )
  })
})

test.describe('the private and commercial transporter forms without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('saving a commercial transporter works as a plain form post', async ({
    page
  }) => {
    await openCommercialTransporterForm(
      page,
      'stub-org-commercial-transporter-no-js'
    )
    await fillCommercialTransporterForm(page)

    await saveTransporterButton(page, copy.commercialTransporterForm).click()

    await expect(page).toHaveURL(addressBookPathPattern)
    await expect(resultsLineOf(page)).toHaveText('Showing 1-1 of 1')
  })
})
