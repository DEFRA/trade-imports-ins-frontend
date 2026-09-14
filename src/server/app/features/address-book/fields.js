import Joi from 'joi'

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

const crumbSchema = () => Joi.string().optional().allow('', null)

const nameSchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.name.maxLength)
    .messages({
      'string.empty': 'Enter a name',
      'any.required': 'Enter a name',
      'string.max': `Name must be ${FIELD_RULES.name.maxLength} characters or fewer`
    })

const addressLine1Schema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.addressLine1.maxLength)
    .messages({
      'string.empty': 'Enter address line 1',
      'any.required': 'Enter address line 1',
      'string.max': `Address line 1 must be ${FIELD_RULES.addressLine1.maxLength} characters or fewer`
    })

const addressLine2Schema = () =>
  Joi.string()
    .trim()
    .allow('')
    .max(FIELD_RULES.addressLine2.maxLength)
    .messages({
      'string.max': `Address line 2 must be ${FIELD_RULES.addressLine2.maxLength} characters or fewer`
    })

const townOrCitySchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.townOrCity.maxLength)
    .messages({
      'string.empty': 'Enter a town or city',
      'any.required': 'Enter a town or city',
      'string.max': `Town or city must be ${FIELD_RULES.townOrCity.maxLength} characters or fewer`
    })

const countySchema = () =>
  Joi.string()
    .trim()
    .allow('')
    .max(FIELD_RULES.county.maxLength)
    .messages({
      'string.max': `County must be ${FIELD_RULES.county.maxLength} characters or fewer`
    })

const postcodeSchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.postcode.maxLength)
    .messages({
      'string.empty': 'Enter a postcode',
      'any.required': 'Enter a postcode',
      'string.max': `Postcode must be ${FIELD_RULES.postcode.maxLength} characters or fewer`
    })

const countryCodeSchema = (mdmCountryCodes) =>
  Joi.string()
    .trim()
    .required()
    .valid(...mdmCountryCodes)
    .messages({
      'string.empty': 'Enter a country',
      'any.required': 'Enter a country',
      'any.only': 'Select a country from the list'
    })

const phoneSchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.phone.maxLength)
    .messages({
      'string.empty': 'Enter a telephone number',
      'any.required': 'Enter a telephone number',
      'string.max': `Telephone number must be ${FIELD_RULES.phone.maxLength} characters or fewer`
    })

const emailSchema = () =>
  Joi.string()
    .trim()
    .required()
    .email({ tlds: { allow: false } })
    .max(FIELD_RULES.email.maxLength)
    .messages({
      'string.empty': 'Enter an email address',
      'any.required': 'Enter an email address',
      'string.email': 'Enter an email address in the correct format',
      'string.max': `Email address must be ${FIELD_RULES.email.maxLength} characters or fewer`
    })

export const buildAddressSchema = (mdmCountryCodes) =>
  Joi.object({
    crumb: crumbSchema(),
    name: nameSchema(),
    addressLine1: addressLine1Schema(),
    addressLine2: addressLine2Schema(),
    townOrCity: townOrCitySchema(),
    county: countySchema(),
    postcode: postcodeSchema(),
    countryCode: countryCodeSchema(mdmCountryCodes),
    phone: phoneSchema(),
    email: emailSchema()
  })

const fieldNameOf = (detail) => detail.path.join('-')

export const formatValidationErrors = (joiError) => ({
  errorList: joiError.details.map((detail) => ({
    text: detail.message,
    href: `#${fieldNameOf(detail)}`
  })),
  fieldErrors: Object.fromEntries(
    joiError.details.map((detail) => [
      fieldNameOf(detail),
      { text: detail.message }
    ])
  )
})
