import { describe, expect, test } from 'vitest'

import { validate } from '../../lib/validate/index.js'
import { FIELDS, FIELD_RULES, addressRules, formValuesOf } from './fields.js'
import { copy } from './copy/copy.en.js'

const MDM_CODES = ['GB', 'FR', 'DE']

const rules = addressRules(MDM_CODES)

const REQUIRED_FIELDS = FIELDS.filter((field) => FIELD_RULES[field].required)
const BOUNDED_FIELDS = FIELDS.filter((field) => FIELD_RULES[field].maxLength)

const BUSINESS_NAME = 'Highland Livestock Ltd'
const ADDRESS_LINE_1 = "14 Drover's Way"
const PHONE = '+44 1463 234567'
const EMAIL = 'exports@example.com'

const validAddress = (overrides = {}) => ({
  name: BUSINESS_NAME,
  addressLine1: ADDRESS_LINE_1,
  addressLine2: 'Unit 3',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: PHONE,
  email: EMAIL,
  ...overrides
})

describe('#addressRules', () => {
  test('accepts a valid Standard Address Block and hands its values back', () => {
    const { errors, value } = validate(rules, validAddress())

    expect(errors).toBeNull()
    expect(value).toEqual(validAddress())
  })

  test.each(REQUIRED_FIELDS)(
    'refuses a blank %s with its required message',
    (field) => {
      expect(validate(rules, validAddress({ [field]: '' })).errors).toEqual({
        [field]: copy.errors[field].required
      })
    }
  )

  test('refuses a whitespace-only mandatory field as blank', () => {
    expect(validate(rules, validAddress({ name: '   ' })).errors).toEqual({
      name: copy.errors.name.required
    })
  })

  test.each(BOUNDED_FIELDS)(
    'refuses %s over its maximum length with its length message',
    (field) => {
      const max = FIELD_RULES[field].maxLength

      expect(
        validate(rules, validAddress({ [field]: 'A'.repeat(max + 1) })).errors
      ).toEqual({ [field]: copy.errors[field].maxLength(max) })
    }
  )

  test('refuses a country the reference data does not list as if blank', () => {
    expect(validate(rules, validAddress({ countryCode: 'ZZ' })).errors).toEqual(
      { countryCode: copy.errors.countryCode.required }
    )
  })

  test('refuses a malformed email address', () => {
    expect(
      validate(rules, validAddress({ email: 'not-an-email' })).errors
    ).toEqual({ email: copy.errors.email.format })
  })

  test('accepts a free-string phone number', () => {
    expect(
      validate(rules, validAddress({ phone: 'call the office' })).errors
    ).toBeNull()
  })

  test('lists every failing field in the order the form asks', () => {
    const { errors } = validate(rules, {
      ...formValuesOf(),
      email: 'bad'
    })

    expect(Object.keys(errors)).toEqual(REQUIRED_FIELDS)
    expect(errors.email).toBe(copy.errors.email.format)
  })

  test('hands back trimmed values', () => {
    const { errors, value } = validate(
      rules,
      validAddress({ name: '  Highland Livestock Ltd  ' })
    )

    expect(errors).toBeNull()
    expect(value.name).toBe(BUSINESS_NAME)
  })
})

describe('#FIELD_RULES parity with Java Bean Validation', () => {
  test('maxLengths and mandatory flags match AddressRequest', () => {
    expect(FIELD_RULES.name).toEqual({ maxLength: 255, required: true })
    expect(FIELD_RULES.addressLine1).toEqual({ maxLength: 255, required: true })
    expect(FIELD_RULES.addressLine2).toEqual({
      maxLength: 255,
      required: false
    })
    expect(FIELD_RULES.townOrCity).toEqual({ maxLength: 100, required: true })
    expect(FIELD_RULES.county).toEqual({ maxLength: 100, required: false })
    expect(FIELD_RULES.postcode).toEqual({ maxLength: 12, required: true })
    expect(FIELD_RULES.countryCode).toEqual({ required: true })
    expect(FIELD_RULES.phone).toEqual({ maxLength: 20, required: true })
    expect(FIELD_RULES.email).toEqual({
      maxLength: 254,
      required: true,
      email: true
    })
  })
})

describe('#formValuesOf', () => {
  test('builds a blank form in the order the fields are asked', () => {
    expect(formValuesOf()).toEqual({
      name: '',
      addressLine1: '',
      addressLine2: '',
      townOrCity: '',
      county: '',
      postcode: '',
      countryCode: '',
      phone: '',
      email: ''
    })
    expect(Object.keys(formValuesOf())).toEqual(FIELDS)
  })

  test('reads the form fields from a stored address and blanks what is missing', () => {
    const address = {
      id: '665f1c2ab3e4d51a2c9d0e77',
      name: BUSINESS_NAME,
      addressLine1: ADDRESS_LINE_1,
      townOrCity: 'Inverness',
      postcode: 'IV2 3JH',
      countryCode: 'GB',
      phone: PHONE,
      email: EMAIL,
      deleted: false
    }

    expect(formValuesOf(address)).toEqual({
      name: BUSINESS_NAME,
      addressLine1: ADDRESS_LINE_1,
      addressLine2: '',
      townOrCity: 'Inverness',
      county: '',
      postcode: 'IV2 3JH',
      countryCode: 'GB',
      phone: PHONE,
      email: EMAIL
    })
  })
})
