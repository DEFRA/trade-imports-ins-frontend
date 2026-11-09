import * as transporters from './index.js'
import {
  TRANSPORTER_TYPES,
  NORTHERN_IRELAND_COUNTRY_CODE
} from './transporter-types.js'

const APPROVAL_NUMBER = 'UK/BELF/T2/00104115'

const FIRST_HAULAGE = 'First Haulage'
const SECOND_HAULAGE = 'Second Haulage'

const privateTransporter = (overrides = {}) => ({
  name: 'Aberdeen Livestock Ltd',
  addressLine1: '14 Drovers Way',
  townOrCity: 'Aberdeen',
  postcode: 'AB10 1AA',
  countryCode: 'GB',
  type: TRANSPORTER_TYPES.PRIVATE,
  ...overrides
})

const commercialTransporter = (overrides = {}) => ({
  name: 'Lough Neagh Livestock Ltd',
  addressLine1: '2 Market Street',
  townOrCity: 'Belfast',
  postcode: 'BT1 1AA',
  countryCode: NORTHERN_IRELAND_COUNTRY_CODE,
  type: TRANSPORTER_TYPES.COMMERCIAL,
  approvalNumber: APPROVAL_NUMBER,
  ...overrides
})

let nextOrganisation = 0
const anOrganisation = () => {
  nextOrganisation += 1
  return `stub-org-${nextOrganisation}`
}

export const createTwoTransporters = async (organisationId) => {
  await transporters.createTransporter(
    organisationId,
    privateTransporter({ name: FIRST_HAULAGE })
  )
  await transporters.createTransporter(
    organisationId,
    privateTransporter({ name: SECOND_HAULAGE })
  )
}

export {
  APPROVAL_NUMBER,
  FIRST_HAULAGE,
  SECOND_HAULAGE,
  privateTransporter,
  commercialTransporter,
  anOrganisation
}
