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
