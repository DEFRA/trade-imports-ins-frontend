import {
  maxEmail,
  maxText,
  requiredEmail,
  requiredMaxText
} from '../../lib/validate/index.js'

export const maxLengthMessageFor = (fieldRules, errors, field) =>
  errors[field].maxLength(fieldRules[field].maxLength)

const requiredTextRule = (fieldRules, errors, field) =>
  requiredMaxText(field, fieldRules[field].maxLength, {
    required: errors[field].required,
    maxLength: maxLengthMessageFor(fieldRules, errors, field)
  })

const optionalTextRule = (fieldRules, errors, field) =>
  maxText(
    field,
    fieldRules[field].maxLength,
    maxLengthMessageFor(fieldRules, errors, field)
  )

const emailRule = (fieldRules, errors, field) =>
  (fieldRules[field].required ? requiredEmail : maxEmail)(
    field,
    fieldRules[field].maxLength,
    {
      required: errors[field].required,
      maxLength: maxLengthMessageFor(fieldRules, errors, field),
      format: errors[field].format
    }
  )

export const fieldRuleFor = (fieldRules, errors, field) => {
  const { required, email } = fieldRules[field]
  if (email) {
    return emailRule(fieldRules, errors, field)
  }
  return required
    ? requiredTextRule(fieldRules, errors, field)
    : optionalTextRule(fieldRules, errors, field)
}
