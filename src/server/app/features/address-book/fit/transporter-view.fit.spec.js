import { expect, test } from '@playwright/test'

import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import { copy } from '../copy/copy.en.js'
import { expectNoSeriousOrCriticalViolations } from '../../../../../../fit/axe.js'
import { backLink } from './address-form.js'
import {
  fillCommercialTransporterForm,
  fillPrivateTransporterForm,
  openCommercialTransporterForm,
  openPrivateTransporterForm,
  saveTransporterButton,
  validCommercialTransporter,
  validPrivateTransporter
} from './transporter-form.js'

const TRANSPORTER_TAB_PATTERN = new RegExp(
  `/address-book\\?addressType=${ADDRESS_TYPES.TRANSPORTER}$`
)

const TRANSPORTER_PAGE_PATTERN = /\/address-book\/transporter\/[0-9a-fA-F]{24}/

const viewLinkOf = (page, name) =>
  page
    .getByRole('row', { name: new RegExp(name) })
    .getByRole('link', { name: `${copy.list.table.view} ${name}`, exact: true })

const saveAndOpenPrivateTransporter = async (page, sessionName) => {
  await openPrivateTransporterForm(page, sessionName)
  await fillPrivateTransporterForm(page)
  await saveTransporterButton(page, copy.privateTransporterForm).click()
  await expect(page).toHaveURL(TRANSPORTER_TAB_PATTERN)
  await viewLinkOf(page, validPrivateTransporter.name).click()
}

test.describe("a transporter's own page", () => {
  test('opens from the list at its own transporter URL, headed with its name, with no serious or critical accessibility violations', async ({
    page
  }) => {
    await saveAndOpenPrivateTransporter(page, 'stub-org-transporter-view')

    await expect(page).toHaveURL(TRANSPORTER_PAGE_PATTERN)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: validPrivateTransporter.name
      })
    ).toBeVisible()
    await expectNoSeriousOrCriticalViolations(page, 'View a transporter')
  })

  test('shows no approval number row for a private transporter', async ({
    page
  }) => {
    await saveAndOpenPrivateTransporter(
      page,
      'stub-org-transporter-view-private'
    )

    await expect(
      page.getByText(copy.list.table.approvalNumber, { exact: true })
    ).toHaveCount(0)
  })

  test('shows a commercial transporter’s approval number and its fixed Northern Ireland country', async ({
    page
  }) => {
    await openCommercialTransporterForm(
      page,
      'stub-org-transporter-view-commercial'
    )
    await fillCommercialTransporterForm(page)
    await saveTransporterButton(page, copy.commercialTransporterForm).click()
    await expect(page).toHaveURL(TRANSPORTER_TAB_PATTERN)

    await viewLinkOf(page, validCommercialTransporter.name).click()

    await expect(page).toHaveURL(TRANSPORTER_PAGE_PATTERN)
    await expect(
      page.getByText(validCommercialTransporter.approvalNumber, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(copy.commercialTransporterForm.country, { exact: true })
    ).toBeVisible()
  })

  test('Back returns to the address book filtered to transporters', async ({
    page
  }) => {
    await saveAndOpenPrivateTransporter(page, 'stub-org-transporter-view-back')

    await backLink(page).click()

    await expect(page).toHaveURL(TRANSPORTER_TAB_PATTERN)
  })
})
