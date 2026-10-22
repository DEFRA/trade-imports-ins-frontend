import {
  compose,
  maxEmail,
  maxText,
  oneOf,
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
  countryCode: { required: true, oneOfCountryCodes: true },
  phone: { maxLength: 20, required: true },
  email: { maxLength: 254, required: true, email: true }
}

export const FIELDS = Object.keys(FIELD_RULES)

export const isRequiredField = (field) => FIELD_RULES[field].required === true

export const ADDRESS_FIELDS = [
  'name',
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postcode',
  'countryCode'
]

export const addressFieldText = (address, countryLabel, field) =>
  field === 'countryCode' ? countryLabel : (address[field] ?? null)

export const formValuesOf = (address = {}) =>
  Object.fromEntries(FIELDS.map((field) => [field, address[field] ?? '']))

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

const emailMessagesFor = (field) => ({
  required: errors[field].required,
  maxLength: maxLengthMessageFor(field),
  format: errors[field].format
})

const emailRule = (field, required) =>
  (required ? requiredEmail : maxEmail)(
    field,
    maxLengthOf(field),
    emailMessagesFor(field)
  )

const countryRule = (field, required, countryCodes) =>
  (required ? requiredOneOf : oneOf)(
    field,
    countryCodes,
    errors[field].required
  )

const ruleFor = (field, countryCodes) => {
  const { required, email, oneOfCountryCodes } = FIELD_RULES[field]
  if (oneOfCountryCodes) {
    return countryRule(field, required, countryCodes)
  }
  if (email) {
    return emailRule(field, required)
  }
  return required ? requiredTextRule(field) : optionalTextRule(field)
}

export const addressRules = (countryCodes) =>
  compose(...FIELDS.map((field) => ruleFor(field, countryCodes)))
