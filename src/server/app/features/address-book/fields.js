import Joi from 'joi'

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

const crumbSchema = () => Joi.string().optional().allow('', null)

const nameSchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.name.maxLength)
    .messages({
      'string.empty': errors.name.required,
      'any.required': errors.name.required,
      'string.max': errors.name.maxLength(FIELD_RULES.name.maxLength)
    })

const addressLine1Schema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.addressLine1.maxLength)
    .messages({
      'string.empty': errors.addressLine1.required,
      'any.required': errors.addressLine1.required,
      'string.max': errors.addressLine1.maxLength(
        FIELD_RULES.addressLine1.maxLength
      )
    })

const addressLine2Schema = () =>
  Joi.string()
    .trim()
    .allow('')
    .max(FIELD_RULES.addressLine2.maxLength)
    .messages({
      'string.max': errors.addressLine2.maxLength(
        FIELD_RULES.addressLine2.maxLength
      )
    })

const townOrCitySchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.townOrCity.maxLength)
    .messages({
      'string.empty': errors.townOrCity.required,
      'any.required': errors.townOrCity.required,
      'string.max': errors.townOrCity.maxLength(
        FIELD_RULES.townOrCity.maxLength
      )
    })

const countySchema = () =>
  Joi.string()
    .trim()
    .allow('')
    .max(FIELD_RULES.county.maxLength)
    .messages({
      'string.max': errors.county.maxLength(FIELD_RULES.county.maxLength)
    })

const postcodeSchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.postcode.maxLength)
    .messages({
      'string.empty': errors.postcode.required,
      'any.required': errors.postcode.required,
      'string.max': errors.postcode.maxLength(FIELD_RULES.postcode.maxLength)
    })

const countryCodeSchema = (mdmCountryCodes) =>
  Joi.string()
    .trim()
    .required()
    .valid(...mdmCountryCodes)
    .messages({
      'string.empty': errors.countryCode.required,
      'any.required': errors.countryCode.required,
      'any.only': errors.countryCode.fromList
    })

const phoneSchema = () =>
  Joi.string()
    .trim()
    .required()
    .max(FIELD_RULES.phone.maxLength)
    .messages({
      'string.empty': errors.phone.required,
      'any.required': errors.phone.required,
      'string.max': errors.phone.maxLength(FIELD_RULES.phone.maxLength)
    })

const emailSchema = () =>
  Joi.string()
    .trim()
    .required()
    .email({ tlds: { allow: false } })
    .max(FIELD_RULES.email.maxLength)
    .messages({
      'string.empty': errors.email.required,
      'any.required': errors.email.required,
      'string.email': errors.email.format,
      'string.max': errors.email.maxLength(FIELD_RULES.email.maxLength)
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
