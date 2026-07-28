import Joi from 'joi'

const FIELD_RULES = {
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

export { FIELD_RULES }

export function buildAddressSchema(mdmCountryCodes) {
  return Joi.object({
    name: Joi.string().trim().required().max(255).messages({
      'string.empty': 'Enter a name',
      'any.required': 'Enter a name',
      'string.max': 'Name must be 255 characters or fewer'
    }),
    addressLine1: Joi.string().trim().required().max(255).messages({
      'string.empty': 'Enter address line 1',
      'any.required': 'Enter address line 1',
      'string.max': 'Address line 1 must be 255 characters or fewer'
    }),
    addressLine2: Joi.string().trim().allow('').max(255).messages({
      'string.max': 'Address line 2 must be 255 characters or fewer'
    }),
    townOrCity: Joi.string().trim().required().max(100).messages({
      'string.empty': 'Enter a town or city',
      'any.required': 'Enter a town or city',
      'string.max': 'Town or city must be 100 characters or fewer'
    }),
    county: Joi.string().trim().allow('').max(100).messages({
      'string.max': 'County must be 100 characters or fewer'
    }),
    postcode: Joi.string().trim().required().max(12).messages({
      'string.empty': 'Enter a postcode',
      'any.required': 'Enter a postcode',
      'string.max': 'Postcode must be 12 characters or fewer'
    }),
    countryCode: Joi.string()
      .trim()
      .required()
      .valid(...mdmCountryCodes)
      .messages({
        'string.empty': 'Enter a country',
        'any.required': 'Enter a country',
        'any.only': 'Select a country from the list'
      }),
    phone: Joi.string().trim().required().max(20).messages({
      'string.empty': 'Enter a telephone number',
      'any.required': 'Enter a telephone number',
      'string.max': 'Telephone number must be 20 characters or fewer'
    }),
    email: Joi.string()
      .trim()
      .required()
      .email({ tlds: { allow: false } })
      .max(254)
      .messages({
        'string.empty': 'Enter an email address',
        'any.required': 'Enter an email address',
        'string.email': 'Enter an email address in the correct format',
        'string.max': 'Email address must be 254 characters or fewer'
      })
  })
}
