import Joi from 'joi'

import { isRealDate, parseDateText } from './calendar.js'
import { copyFor } from '../../shared/copy.js'
import { validatorDefaults as en } from '../../shared/copy.en.js'
import { validatorDefaults as cy } from '../../shared/copy.cy.js'

const defaults = copyFor({ en, cy })

const POSTCODE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/
const VEHICLE_REG = /^[A-Za-z]{2}\d{2}\s?[A-Za-z]{3}$/
const PHONE_ALLOWED = /^[0-9+()\-.,;\s]+$/
const TIME_24_HOUR = /^([01]\d|2[0-3]):[0-5]\d$/
const UK_PHONE_MIN_DIGITS = 7
const UK_PHONE_MAX_DIGITS = 15
const INVALID_ERROR_CODE = 'any.invalid'
const ONLY_ERROR_CODE = 'any.only'
const RANGE_ERROR_CODE = 'date.range'
const NUMBER_ERROR_CODE = 'number.base'
const NUMBER_RANGE_ERROR_CODE = 'number.range'

const single = (name, rule) => Joi.object({ [name]: rule }).unknown(true)

export const compose = (...schemas) =>
  schemas.reduce(
    (combined, schema) => combined.concat(schema),
    Joi.object({}).unknown(true)
  )

export const requiredText = (name, message) =>
  single(
    name,
    Joi.string().trim().required().messages({
      'string.empty': message,
      'any.required': message
    })
  )

export const requiredExactDigits = (name, digitCount, messages) =>
  single(
    name,
    Joi.string().required().length(digitCount).pattern(/^\d+$/).messages({
      'string.empty': messages.required,
      'any.required': messages.required,
      'string.length': messages.length,
      'string.pattern.base': messages.digitsOnly
    })
  )

export const optionalText = (name) =>
  single(name, Joi.string().trim().allow(''))

export const maxText = (name, max, message) =>
  single(
    name,
    Joi.string()
      .trim()
      .allow('')
      .max(max)
      .messages({ 'string.max': message ?? defaults.maxLength(max) })
  )

// Not `compose(requiredText, maxText)`: composing schemas merges `maxText`'s
// `.allow('')` onto the required rule, so blank would then pass.
export const requiredMaxText = (name, max, messages) =>
  single(
    name,
    Joi.string()
      .trim()
      .required()
      .max(max)
      .messages({
        'string.empty': messages.required,
        'any.required': messages.required,
        'string.max': messages.maxLength ?? defaults.maxLength(max)
      })
  )

export const requiredEmail = (name, max, messages) =>
  single(
    name,
    Joi.string()
      .trim()
      .required()
      .max(max)
      .email({ tlds: { allow: false } })
      .messages({
        'string.empty': messages.required,
        'any.required': messages.required,
        'string.max': messages.maxLength ?? defaults.maxLength(max),
        'string.email': messages.format
      })
  )

export const pattern = (name, regex, message) =>
  single(
    name,
    Joi.string()
      .trim()
      .allow('')
      .pattern(regex)
      .messages({ 'string.pattern.base': message })
  )

export const postcode = (name, message = defaults.postcode) =>
  pattern(name, POSTCODE, message)

export const vehicleReg = (name, message = defaults.vehicleReg) =>
  pattern(name, VEHICLE_REG, message)

export const ukPhone = (name, message = defaults.ukPhone) =>
  single(
    name,
    Joi.string()
      .trim()
      .allow('')
      .pattern(PHONE_ALLOWED)
      .custom((raw, helpers) => {
        const digits = raw.replace(/\D/g, '')
        if (
          digits.length < UK_PHONE_MIN_DIGITS ||
          digits.length > UK_PHONE_MAX_DIGITS
        ) {
          return helpers.error(INVALID_ERROR_CODE)
        }
        return raw
      })
      .messages({
        'string.pattern.base': message,
        [INVALID_ERROR_CODE]: message
      })
  )

export const requiredOneOf = (name, values, message) => {
  const required = Joi.string().trim().required()
  const membership =
    values.length === 0
      ? required.custom((_raw, helpers) => helpers.error(ONLY_ERROR_CODE))
      : required.valid(...values)
  return single(
    name,
    membership.messages({
      'string.empty': message,
      'any.required': message,
      [ONLY_ERROR_CODE]: message
    })
  )
}

export const oneOf = (name, values, message = defaults.oneOf) =>
  single(
    name,
    Joi.string()
      .allow('')
      .valid('', ...values)
      .messages({ 'any.only': message })
  )

const wholeNumberInRange = (min, max) => (raw, helpers) => {
  if (!/^-?\d+$/.test(raw)) {
    return helpers.error(NUMBER_ERROR_CODE)
  }
  const parsed = Number(raw)
  if ((min != null && parsed < min) || (max != null && parsed > max)) {
    return helpers.error(NUMBER_RANGE_ERROR_CODE)
  }
  return raw
}

export const integerInRange = (name, { min, max, message } = {}) =>
  single(
    name,
    Joi.string()
      .trim()
      .allow('')
      .custom(wholeNumberInRange(min, max))
      .messages({
        [NUMBER_ERROR_CODE]: message ?? defaults.wholeNumber,
        [NUMBER_RANGE_ERROR_CODE]: message ?? defaults.numberBetween(min, max)
      })
  )

export const requiredIntegerInRange = (name, { min, max, messages }) =>
  single(
    name,
    Joi.string()
      .trim()
      .required()
      .custom(wholeNumberInRange(min, max))
      .messages({
        'string.empty': messages.required,
        'any.required': messages.required,
        [NUMBER_ERROR_CODE]: messages.invalid ?? defaults.wholeNumber,
        [NUMBER_RANGE_ERROR_CODE]:
          messages.invalid ?? defaults.numberBetween(min, max)
      })
  )

const classifyDateFill = (filledCount, totalCount) => {
  if (filledCount === 0) {
    return 'empty'
  }
  if (filledCount < totalCount) {
    return 'partial'
  }
  return 'complete'
}

const isValidCalendarDate = (parts) => {
  const [parsedDay, parsedMonth, parsedYear] = parts.map(Number)
  return isRealDate(parsedYear, parsedMonth, parsedDay)
}

export const dateParts = (name, message = defaults.date) => {
  const dayKey = `${name}-day`
  const monthKey = `${name}-month`
  const yearKey = `${name}-year`
  return Joi.object({
    [dayKey]: Joi.any()
      .custom((day, helpers) => {
        const siblings = helpers.state.ancestors[0] ?? {}
        const parts = [day, siblings[monthKey], siblings[yearKey]].map((part) =>
          String(part ?? '').trim()
        )
        const filled = parts.filter((part) => part !== '')
        const fill = classifyDateFill(filled.length, parts.length)
        if (fill === 'empty') {
          return day
        }
        if (fill === 'partial') {
          return helpers.error(INVALID_ERROR_CODE)
        }
        return isValidCalendarDate(parts)
          ? day
          : helpers.error(INVALID_ERROR_CODE)
      })
      .messages({ [INVALID_ERROR_CODE]: message }),
    [monthKey]: Joi.any(),
    [yearKey]: Joi.any()
  }).unknown(true)
}

const isOutsideBounds = (date, min, max) =>
  (min != null && date.getTime() < min.getTime()) ||
  (max != null && date.getTime() > max.getTime())

const dateWithinBounds = (min, max) => (raw, helpers) => {
  const parsed = parseDateText(raw)
  if (!parsed) {
    return helpers.error(INVALID_ERROR_CODE)
  }
  return isOutsideBounds(parsed, min, max)
    ? helpers.error(RANGE_ERROR_CODE)
    : raw
}

export const dateTextInRange = (
  name,
  { min, max, invalidMessage = defaults.date, rangeMessage } = {}
) =>
  single(
    name,
    Joi.string()
      .trim()
      .allow('')
      .custom(dateWithinBounds(min, max))
      .messages({
        [INVALID_ERROR_CODE]: invalidMessage,
        [RANGE_ERROR_CODE]: rangeMessage ?? invalidMessage
      })
  )

export const dateText = (name, message = defaults.date) =>
  dateTextInRange(name, { invalidMessage: message })

export const requiredDateTextInRange = (name, { min, max, messages }) =>
  single(
    name,
    Joi.string()
      .trim()
      .required()
      .custom(dateWithinBounds(min, max))
      .messages({
        'string.empty': messages.required,
        'any.required': messages.required,
        [INVALID_ERROR_CODE]: messages.invalid ?? defaults.date,
        [RANGE_ERROR_CODE]: messages.range ?? messages.invalid ?? defaults.date
      })
  )

export const requiredTime = (name, messages) =>
  single(
    name,
    Joi.string()
      .trim()
      .required()
      .pattern(TIME_24_HOUR)
      .messages({
        'string.empty': messages.required,
        'any.required': messages.required,
        'string.pattern.base': messages.invalid ?? defaults.time
      })
  )

export const requiredDateText = (name, messages) =>
  requiredDateTextInRange(name, { messages })
