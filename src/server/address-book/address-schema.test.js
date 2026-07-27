import { describe, expect, test } from 'vitest'

import { buildAddressSchema, FIELD_RULES } from './address-schema.js'

const MDM_CODES = ['GB', 'FR', 'DE']

function validAddress(overrides = {}) {
  return {
    name: 'Highland Livestock Ltd',
    addressLine1: '14 Drover\'s Way',
    addressLine2: 'Unit 3',
    townOrCity: 'Inverness',
    county: 'Highland',
    postcode: 'IV2 3JH',
    countryCode: 'GB',
    phone: '+44 1463 234567',
    email: 'exports@example.com',
    ...overrides
  }
}

describe('#buildAddressSchema', () => {
  const schema = buildAddressSchema(MDM_CODES)

  test('accepts a valid Standard Address Block', () => {
    const { error } = schema.validate(validAddress())
    expect(error).toBeUndefined()
  })

  test('rejects missing mandatory fields', () => {
    const { error } = schema.validate(validAddress({ name: '' }))
    expect(error?.details.map((d) => d.path[0])).toContain('name')
  })

  test('rejects over-max fields', () => {
    const { error } = schema.validate(
      validAddress({ postcode: 'a'.repeat(13) })
    )
    expect(error?.details[0].path[0]).toBe('postcode')
  })

  test('validates countryCode against MDM alpha-2 codes', () => {
    const { error: invalid } = schema.validate(
      validAddress({ countryCode: 'ZZ' })
    )
    expect(invalid).toBeDefined()

    const { error: blank } = schema.validate(validAddress({ countryCode: '' }))
    expect(blank).toBeDefined()
  })

  test('enforces email format and accepts free-string phone', () => {
    const emailError = schema.validate(validAddress({ email: 'not-an-email' }))
      .error
    expect(emailError?.details[0].path[0]).toBe('email')

    const phoneOk = schema.validate(validAddress({ phone: 'call the office' }))
    expect(phoneOk.error).toBeUndefined()
  })

  test('does not include operatorType or transporter fields', () => {
    const keys = Object.keys(schema.describe().keys)
    expect(keys).not.toContain('operatorType')
    expect(keys).not.toContain('approvalNumber')
    expect(keys).not.toContain('transporterCategory')
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
