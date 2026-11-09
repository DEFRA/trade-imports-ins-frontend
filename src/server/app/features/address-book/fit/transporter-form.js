import { copy } from '../copy/copy.en.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import { TRANSPORTER_TYPES } from '../../../services/transporters/index.js'
import {
  transporterTypePath,
  privateTransporterPath,
  commercialTransporterPath,
  addressTypePath
} from '../../../shared/paths.js'
import { signInAndOpen } from '../../../../../../fit/sign-in.js'
import { chooseAddressType } from './address-form.js'

const { transporterType: typeCopy } = copy

export const transporterTypeRadio = (page, transporterType) =>
  page.getByRole('radio', {
    name: typeCopy.options[transporterType].label,
    exact: true
  })

export const transporterContinueButton = (page) =>
  page.getByRole('button', { name: typeCopy.continue })

export const chooseTransporterType = async (
  page,
  transporterType = TRANSPORTER_TYPES.PRIVATE
) => {
  await transporterTypeRadio(page, transporterType).check()
  await transporterContinueButton(page).click()
}

export const openTransporterTypePage = async (page, organisationId) => {
  await signInAndOpen(page, organisationId, addressTypePath())
  await chooseAddressType(page, ADDRESS_TYPES.TRANSPORTER)
}

export const openPrivateTransporterForm = async (page, organisationId) => {
  await openTransporterTypePage(page, organisationId)
  await chooseTransporterType(page, TRANSPORTER_TYPES.PRIVATE)
}

export const openCommercialTransporterForm = async (page, organisationId) => {
  await openTransporterTypePage(page, organisationId)
  await chooseTransporterType(page, TRANSPORTER_TYPES.COMMERCIAL)
}

export const validPrivateTransporter = {
  name: 'Carrier Close Transporters',
  addressLine1: '4 Carrier Close',
  addressLine2: 'Unit 2',
  townOrCity: 'Carlisle',
  county: 'Cumbria',
  postcode: 'CA1 3CC',
  countryCode: 'GB',
  email: 'ops@carrier.example.co.uk',
  phone: '01228 555 0177'
}

export const validCommercialTransporter = {
  name: 'Shore Road Haulage',
  approvalNumber: 'NI/TA/2026/0099',
  addressLine1: '4 Shore Road',
  addressLine2: 'Unit 2',
  townOrCity: 'Antrim',
  county: 'County Antrim',
  postcode: 'BT41 4LB',
  email: 'ops@shoreroad.example',
  phone: '+44 28 9446 1200'
}

export const fillPrivateTransporterForm = async (page, overrides = {}) => {
  const values = { ...validPrivateTransporter, ...overrides }
  const { fields } = copy.privateTransporterForm
  await page.getByLabel(fields.name).fill(values.name)
  await page.getByLabel(fields.addressLine1).fill(values.addressLine1)
  await page.getByLabel(fields.addressLine2).fill(values.addressLine2)
  await page.getByLabel(fields.townOrCity).fill(values.townOrCity)
  await page.getByLabel(fields.county).fill(values.county)
  await page.getByLabel(fields.postcode).fill(values.postcode)
  await page.getByLabel(fields.countryCode).selectOption(values.countryCode)
  await page.getByLabel(fields.email).fill(values.email)
  await page.getByLabel(fields.phone).fill(values.phone)
}

export const fillCommercialTransporterForm = async (page, overrides = {}) => {
  const values = { ...validCommercialTransporter, ...overrides }
  const { fields } = copy.commercialTransporterForm
  await page.getByLabel(fields.name).fill(values.name)
  await page.getByLabel(fields.approvalNumber).fill(values.approvalNumber)
  await page.getByLabel(fields.addressLine1).fill(values.addressLine1)
  await page.getByLabel(fields.addressLine2).fill(values.addressLine2)
  await page.getByLabel(fields.townOrCity).fill(values.townOrCity)
  await page.getByLabel(fields.county).fill(values.county)
  await page.getByLabel(fields.postcode).fill(values.postcode)
  await page.getByLabel(fields.email).fill(values.email)
  await page.getByLabel(fields.phone).fill(values.phone)
}

export const saveTransporterButton = (page, formCopy) =>
  page.getByRole('button', { name: formCopy.save })

export const cancelTransporterButton = (page, formCopy) =>
  page.getByRole('button', { name: formCopy.cancel })

export {
  privateTransporterPath,
  commercialTransporterPath,
  transporterTypePath
}
