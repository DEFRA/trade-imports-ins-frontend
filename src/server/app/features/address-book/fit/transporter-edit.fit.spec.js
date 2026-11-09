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
import { transporterApprovalNumberCellOf } from './address-book-list.js'

const TRANSPORTER_TAB_PATTERN = new RegExp(
  `/address-book\\?addressType=${ADDRESS_TYPES.TRANSPORTER}$`
)
const EDIT_PAGE_PATTERN = /\/address-book\/transporter\/[0-9a-fA-F]{24}\/edit/

const viewLinkOf = (page, name) =>
  page
    .getByRole('row', { name: new RegExp(name) })
    .getByRole('link', { name: `${copy.list.table.view} ${name}`, exact: true })

const openEditForm = async (page, sessionName) => {
  await openPrivateTransporterForm(page, sessionName)
  await fillPrivateTransporterForm(page)
  await saveTransporterButton(page, copy.privateTransporterForm).click()
  await expect(page).toHaveURL(TRANSPORTER_TAB_PATTERN)
  await viewLinkOf(page, validPrivateTransporter.name).click()
  await page.getByRole('button', { name: copy.view.edit, exact: true }).click()
}

test.describe('editing a transporter from its own page', () => {
  test('opens the form holding the stored values, with no serious or critical accessibility violations', async ({
    page
  }) => {
    await openEditForm(page, 'stub-org-transporter-edit')

    await expect(page).toHaveURL(EDIT_PAGE_PATTERN)
    await expect(
      page.getByRole('heading', { level: 1, name: copy.editTransporter.title })
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.privateTransporterForm.fields.name)
    ).toHaveValue(validPrivateTransporter.name)
    await expectNoSeriousOrCriticalViolations(page, 'Edit a transporter')
  })

  test('saves a changed name, confirming it and listing the transporter under it', async ({
    page
  }) => {
    const changedName = 'Highland Haulage and Sons Ltd'
    await openEditForm(page, 'stub-org-transporter-edit-save')

    await page
      .getByLabel(copy.privateTransporterForm.fields.name)
      .fill(changedName)
    await page
      .getByRole('button', { name: copy.editTransporter.save, exact: true })
      .click()

    await expect(page).toHaveURL(TRANSPORTER_TAB_PATTERN)
    await expect(
      page.getByText(`${changedName} updated in your address book`)
    ).toBeVisible()
    await expect(transporterApprovalNumberCellOf(page, changedName)).toHaveText(
      copy.notApplicable
    )
  })

  test('a blank name refuses the save, with no serious or critical accessibility violations', async ({
    page
  }) => {
    await openEditForm(page, 'stub-org-transporter-edit-blank-name')

    await page.getByLabel(copy.privateTransporterForm.fields.name).fill('')
    await page
      .getByRole('button', { name: copy.editTransporter.save, exact: true })
      .click()

    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Edit a transporter refused'
    )
  })

  test('Cancel leaves the transporter as it was', async ({ page }) => {
    await openEditForm(page, 'stub-org-transporter-edit-cancel')
    const changedName = 'Never Saved Ltd'

    await page
      .getByLabel(copy.privateTransporterForm.fields.name)
      .fill(changedName)
    await page
      .getByRole('button', { name: copy.editTransporter.cancel, exact: true })
      .click()

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: validPrivateTransporter.name
      })
    ).toBeVisible()
    await expect(page.getByText(changedName)).toHaveCount(0)
  })
})
