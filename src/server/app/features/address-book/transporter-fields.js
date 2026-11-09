import { NORTHERN_IRELAND_COUNTRY_CODE } from '../../services/transporters/transporter-types.js'
import {
  compose,
  requiredMaxText,
  requiredOneOf
} from '../../lib/validate/index.js'
import { copyFor } from '../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { fieldRuleFor } from './field-rule.js'

const { errors } = copyFor({ en, cy })

const TRANSPORTER_FIELD_RULES = {
  name: { maxLength: 255, required: true },
  addressLine1: { maxLength: 255, required: true },
  addressLine2: { maxLength: 255, required: false },
  townOrCity: { maxLength: 100, required: true },
  county: { maxLength: 100, required: false },
  postcode: { maxLength: 12, required: true },
  email: { maxLength: 254, required: true, email: true },
  phone: { maxLength: 20, required: true }
}

const TRANSPORTER_FIELDS = Object.keys(TRANSPORTER_FIELD_RULES)

export const transporterFieldRuleFor = (field) =>
  fieldRuleFor(TRANSPORTER_FIELD_RULES, errors, field)

export const transporterFormValuesOf = (payload = {}) =>
  Object.fromEntries(
    TRANSPORTER_FIELDS.map((field) => [field, (payload[field] ?? '').trim()])
  )

export const privateTransporterFormValuesOf = (payload = {}) => ({
  ...transporterFormValuesOf(payload),
  countryCode: (payload.countryCode ?? '').trim()
})

export const commercialTransporterFormValuesOf = (payload = {}) => ({
  ...transporterFormValuesOf(payload),
  approvalNumber: (payload.approvalNumber ?? '').trim()
})

/** The fields a private transporter must hold: the ones every transporter
 * holds, and a country the trader chooses from the offered list. */
export const privateTransporterRules = (countryCodes) =>
  compose(
    ...TRANSPORTER_FIELDS.map(transporterFieldRuleFor),
    requiredOneOf('countryCode', countryCodes, errors.countryCode.required)
  )

const APPROVAL_NUMBER_MAX_LENGTH = 50

/** The fields a commercial transporter must hold: the ones every transporter
 * holds, an approval number, and Northern Ireland as its only country. */
export const commercialTransporterRules = () =>
  compose(
    ...TRANSPORTER_FIELDS.map(transporterFieldRuleFor),
    requiredMaxText('approvalNumber', APPROVAL_NUMBER_MAX_LENGTH, {
      required: errors.approvalNumber.required,
      maxLength: errors.approvalNumber.maxLength(APPROVAL_NUMBER_MAX_LENGTH)
    }),
    requiredOneOf(
      'countryCode',
      [NORTHERN_IRELAND_COUNTRY_CODE],
      errors.countryFixed
    )
  )
