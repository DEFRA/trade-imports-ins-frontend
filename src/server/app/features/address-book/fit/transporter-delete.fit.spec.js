import { expect, test } from '@playwright/test'

import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import { copy } from '../copy/copy.en.js'
import { expectNoSeriousOrCriticalViolations } from '../../../../../../fit/axe.js'
import {
  fillPrivateTransporterForm,
  openPrivateTransporterForm,
  saveTransporterButton,
  validPrivateTransporter
} from './transporter-form.js'

const TRANSPORTER_TAB_PATTERN = new RegExp(
  `/address-book\\?addressType=${ADDRESS_TYPES.TRANSPORTER}$`
)
const DELETE_PAGE_PATTERN =
  /\/address-book\/transporter\/[0-9a-fA-F]{24}\/delete/

const TRANSPORTER_NAME = validPrivateTransporter.name

const viewLinkOf = (page, name) =>
  page
    .getByRole('row', { name: new RegExp(name) })
    .getByRole('link', { name: `${copy.list.table.view} ${name}`, exact: true })

const openDeleteConfirmation = async (page, sessionName) => {
  await openPrivateTransporterForm(page, sessionName)
  await fillPrivateTransporterForm(page)
  await saveTransporterButton(page, copy.privateTransporterForm).click()
  await expect(page).toHaveURL(TRANSPORTER_TAB_PATTERN)
  await viewLinkOf(page, TRANSPORTER_NAME).click()
  await page
    .getByRole('button', { name: copy.view.delete, exact: true })
    .click()
}

test.describe('deleting a transporter from its own page', () => {
  test('asks for confirmation, summarising the transporter, with no serious or critical accessibility violations', async ({
    page
  }) => {
    await openDeleteConfirmation(page, 'stub-org-transporter-delete')

    await expect(page).toHaveURL(DELETE_PAGE_PATTERN)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: copy.deleteTransporter.title
      })
    ).toBeVisible()
    await expect(page.getByText(TRANSPORTER_NAME)).toBeVisible()
    await expect(page.getByText(copy.deleteTransporter.warning)).toBeVisible()
    await expectNoSeriousOrCriticalViolations(page, 'Delete a transporter')
  })

  test('confirming removes it from the list and says so by name', async ({
    page
  }) => {
    await openDeleteConfirmation(page, 'stub-org-transporter-delete-confirm')

    await page
      .getByRole('button', {
        name: copy.deleteTransporter.confirm,
        exact: true
      })
      .click()

    await expect(page).toHaveURL(TRANSPORTER_TAB_PATTERN)
    await expect(
      page.getByText(`${TRANSPORTER_NAME} deleted from your address book`)
    ).toBeVisible()
    await expect(
      page.getByRole('row', { name: new RegExp(TRANSPORTER_NAME) })
    ).toHaveCount(0)
  })

  test('cancelling leaves the transporter in the address book', async ({
    page
  }) => {
    await openDeleteConfirmation(page, 'stub-org-transporter-delete-cancel')

    await page
      .getByRole('link', { name: copy.deleteTransporter.cancel, exact: true })
      .click()

    await expect(
      page.getByRole('heading', { level: 1, name: TRANSPORTER_NAME })
    ).toBeVisible()
  })
})
