import { describe, expect, test } from 'vitest'

import {
  STORED_ADDRESS,
  VALID_ADDRESS_PAYLOAD
} from '../../../common/test-helpers/address-book-requests.js'
import { validate } from '../../lib/validate/index.js'
import {
  FIELDS,
  FIELD_RULES,
  addressRules,
  formValuesOf,
  isRequiredField,
  postalLinesOf
} from './fields.js'
import { copy } from './copy/copy.en.js'

const COUNTRY_CODES = ['GB', 'FR', 'DE']

const rules = addressRules(COUNTRY_CODES)

const REQUIRED_FIELDS = FIELDS.filter(isRequiredField)
const BOUNDED_FIELDS = FIELDS.filter((field) => FIELD_RULES[field].maxLength)

const addressWith = (overrides = {}) => ({
  ...VALID_ADDRESS_PAYLOAD,
  addressLine2: STORED_ADDRESS.addressLine2,
  county: STORED_ADDRESS.county,
  ...overrides
})

describe('#addressRules', () => {
  test('Should accept a valid Standard Address Block and hand its values back', () => {
    const { errors, value } = validate(rules, addressWith())

    expect(errors).toBeNull()
    expect(value).toEqual(addressWith())
  })

  test.each(REQUIRED_FIELDS)(
    'Should refuse a blank %s with its required message',
    (field) => {
      expect(validate(rules, addressWith({ [field]: '' })).errors).toEqual({
        [field]: copy.errors[field].required
      })
    }
  )

  test('Should refuse a whitespace-only mandatory field as blank', () => {
    expect(validate(rules, addressWith({ name: '   ' })).errors).toEqual({
      name: copy.errors.name.required
    })
  })

  test.each(BOUNDED_FIELDS)(
    'Should refuse %s over its maximum length with its length message',
    (field) => {
      const { maxLength } = FIELD_RULES[field]

      expect(
        validate(rules, addressWith({ [field]: 'A'.repeat(maxLength + 1) }))
          .errors
      ).toEqual({ [field]: copy.errors[field].maxLength(maxLength) })
    }
  )

  test('Should refuse a country the reference data does not list as if blank', () => {
    expect(validate(rules, addressWith({ countryCode: 'ZZ' })).errors).toEqual({
      countryCode: copy.errors.countryCode.required
    })
  })

  test('Should refuse a malformed email address', () => {
    expect(
      validate(rules, addressWith({ email: 'not-an-email' })).errors
    ).toEqual({ email: copy.errors.email.format })
  })

  test('Should accept a free-string phone number', () => {
    expect(
      validate(rules, addressWith({ phone: 'call the office' })).errors
    ).toBeNull()
  })

  test('Should list every failing field in the order the form asks', () => {
    const { errors } = validate(rules, {
      ...formValuesOf(),
      email: 'bad'
    })

    expect(Object.keys(errors)).toEqual(REQUIRED_FIELDS)
    expect(errors.email).toBe(copy.errors.email.format)
  })

  test('Should hand back trimmed values', () => {
    const { errors, value } = validate(
      rules,
      addressWith({ name: `  ${STORED_ADDRESS.name}  ` })
    )

    expect(errors).toBeNull()
    expect(value.name).toBe(STORED_ADDRESS.name)
  })
})

describe('#FIELD_RULES', () => {
  test("Should hold each field's maximum length and required flag", () => {
    expect(FIELD_RULES.name).toMatchObject({ maxLength: 255, required: true })
    expect(FIELD_RULES.addressLine1).toMatchObject({
      maxLength: 255,
      required: true
    })
    expect(FIELD_RULES.addressLine2).toMatchObject({
      maxLength: 255,
      required: false
    })
    expect(FIELD_RULES.townOrCity).toMatchObject({
      maxLength: 100,
      required: true
    })
    expect(FIELD_RULES.county).toMatchObject({
      maxLength: 100,
      required: false
    })
    expect(FIELD_RULES.postcode).toMatchObject({
      maxLength: 12,
      required: true
    })
    expect(FIELD_RULES.countryCode).toMatchObject({ required: true })
    expect(FIELD_RULES.phone).toMatchObject({ maxLength: 20, required: true })
    expect(FIELD_RULES.email).toMatchObject({ maxLength: 254, required: true })
  })
})

describe('#isRequiredField', () => {
  test('Should require every field but the second address line and county', () => {
    expect(FIELDS.filter(isRequiredField)).toEqual([
      'name',
      'addressLine1',
      'townOrCity',
      'postcode',
      'countryCode',
      'phone',
      'email'
    ])
  })
})

describe('#formValuesOf', () => {
  test('Should build a blank form in the order the fields are asked', () => {
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

  test('Should read the form fields from a stored address and blank what is missing', () => {
    const address = {
      ...STORED_ADDRESS,
      addressLine2: null,
      county: null
    }

    expect(formValuesOf(address)).toEqual(VALID_ADDRESS_PAYLOAD)
  })
})

describe('#postalLinesOf', () => {
  test('Should give address line 1, address line 2, town or city, county and postcode in that order', () => {
    expect(
      postalLinesOf({
        postcode: STORED_ADDRESS.postcode,
        county: STORED_ADDRESS.county,
        townOrCity: STORED_ADDRESS.townOrCity,
        addressLine2: STORED_ADDRESS.addressLine2,
        addressLine1: STORED_ADDRESS.addressLine1
      })
    ).toEqual([
      STORED_ADDRESS.addressLine1,
      STORED_ADDRESS.addressLine2,
      STORED_ADDRESS.townOrCity,
      STORED_ADDRESS.county,
      STORED_ADDRESS.postcode
    ])
  })

  test('Should leave out blank and missing lines', () => {
    expect(
      postalLinesOf({
        addressLine1: '1 Road',
        addressLine2: '  ',
        townOrCity: 'Town',
        postcode: 'AB1 2CD'
      })
    ).toEqual(['1 Road', 'Town', 'AB1 2CD'])
  })

  test('Should trim the lines it keeps', () => {
    expect(
      postalLinesOf({
        addressLine1: '  1 Road  ',
        townOrCity: 'Town',
        postcode: 'AB1 2CD'
      })
    ).toEqual(['1 Road', 'Town', 'AB1 2CD'])
  })
})
