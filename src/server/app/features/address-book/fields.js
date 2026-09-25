import {
  compose,
  maxText,
  requiredEmail,
  requiredMaxText,
  requiredOneOf
} from '../../lib/validate/index.js'
import { copyFor } from '../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const FIELD_RULES = {
  name: { maxLength: 255, required: true },
  addressLine1: { maxLength: 255, required: true },
  addressLine2: { maxLength: 255, required: false },
  townOrCity: { maxLength: 100, required: true },
  county: { maxLength: 100, required: false },
  postcode: { maxLength: 12, required: true },
  countryCode: { required: true },
  phone: { maxLength: 20, required: true },
  email: { maxLength: 254, required: true, email: true }
}

export const FIELDS = Object.keys(FIELD_RULES)

export const formValuesOf = (source = {}) =>
  Object.fromEntries(FIELDS.map((field) => [field, source[field] ?? '']))

const { errors } = copyFor({ en, cy })

const maxLengthOf = (field) => FIELD_RULES[field].maxLength

const maxLengthMessageFor = (field) =>
  errors[field].maxLength(maxLengthOf(field))

const requiredTextRule = (field) =>
  requiredMaxText(field, maxLengthOf(field), {
    required: errors[field].required,
    maxLength: maxLengthMessageFor(field)
  })

const optionalTextRule = (field) =>
  maxText(field, maxLengthOf(field), maxLengthMessageFor(field))

export const addressRules = (countryCodes) =>
  compose(
    requiredTextRule('name'),
    requiredTextRule('addressLine1'),
    optionalTextRule('addressLine2'),
    requiredTextRule('townOrCity'),
    optionalTextRule('county'),
    requiredTextRule('postcode'),
    requiredOneOf('countryCode', countryCodes, errors.countryCode.required),
    requiredTextRule('phone'),
    requiredEmail('email', maxLengthOf('email'), {
      required: errors.email.required,
      maxLength: maxLengthMessageFor('email'),
      format: errors.email.format
    })
  )
