import { compose, oneOf, requiredOneOf } from '../../lib/validate/index.js'
import { copyFor } from '../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { fieldRuleFor } from './field-rule.js'

export const FIELD_RULES = {
  name: { maxLength: 255, required: true },
  addressLine1: { maxLength: 255, required: true },
  addressLine2: { maxLength: 255, required: false },
  townOrCity: { maxLength: 100, required: true },
  county: { maxLength: 100, required: false },
  postcode: { maxLength: 12, required: true },
  countryCode: { required: true, oneOfCountryCodes: true },
  email: { maxLength: 254, required: true, email: true },
  phone: { maxLength: 20, required: true }
}

export const FIELDS = Object.keys(FIELD_RULES)

export const isRequiredField = (field) => FIELD_RULES[field]?.required === true

export const POSTAL_LINE_FIELDS = [
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postcode'
]

export const ADDRESS_FIELDS = ['name', ...POSTAL_LINE_FIELDS, 'countryCode']

export const displayTextOf = (value) => value?.trim() || null

export const addressFieldText = (address, countryLabel, field) =>
  displayTextOf(field === 'countryCode' ? countryLabel : address[field])

export const postalLinesOf = (address) =>
  POSTAL_LINE_FIELDS.map((field) => displayTextOf(address[field])).filter(
    Boolean
  )

export const formValuesOf = (address = {}) =>
  Object.fromEntries(FIELDS.map((field) => [field, address[field] ?? '']))

export const postedRolesOf = (payload) => [payload.roles ?? []].flat()

const { errors } = copyFor({ en, cy })

export const rolesErrorsOf = (keptRoles) =>
  keptRoles.length > 0 ? null : { roles: errors.roles.required }

const countryRule = (field, countryCodes) =>
  (isRequiredField(field) ? requiredOneOf : oneOf)(
    field,
    countryCodes,
    errors[field].required
  )

const ruleFor = (field, countryCodes) => {
  const { oneOfCountryCodes } = FIELD_RULES[field]
  if (oneOfCountryCodes) {
    return countryRule(field, countryCodes)
  }
  return fieldRuleFor(FIELD_RULES, errors, field)
}

export const addressRules = (countryCodes) =>
  compose(...FIELDS.map((field) => ruleFor(field, countryCodes)))
