import { expect } from 'vitest'

import { copy } from '../../app/features/address-book/copy/copy.en.js'
import { textOf } from './rendered-text.js'

export const REQUIRED_MESSAGES = {
  name: copy.errors.name.required,
  addressLine1: copy.errors.addressLine1.required,
  townOrCity: copy.errors.townOrCity.required,
  postcode: copy.errors.postcode.required,
  countryCode: copy.errors.countryCode.required,
  phone: copy.errors.phone.required
}

export const INVALID_ADDRESS_PAYLOAD_ERRORS = [
  ['name', REQUIRED_MESSAGES.name],
  ['addressLine1', REQUIRED_MESSAGES.addressLine1],
  ['townOrCity', REQUIRED_MESSAGES.townOrCity],
  ['postcode', REQUIRED_MESSAGES.postcode],
  ['countryCode', REQUIRED_MESSAGES.countryCode],
  ['phone', REQUIRED_MESSAGES.phone],
  ['email', copy.errors.email.format]
]

const summaryLinksOf = ($) =>
  $('.govuk-error-summary__list a')
    .map((_, link) => ({
      href: $(link).attr('href'),
      text: textOf($, link)
    }))
    .get()

const fieldErrorsById = ($) =>
  Object.fromEntries(
    $('.govuk-error-message')
      .get()
      .map((message) => [$(message).attr('id'), textOf($, message)])
  )

export const expectSummaryAndFieldErrors = ($, errors) => {
  expect(summaryLinksOf($)).toEqual(
    errors.map(([field, message]) => ({ href: `#${field}`, text: message }))
  )
  expect(fieldErrorsById($)).toEqual(
    Object.fromEntries(
      errors.map(([field, message]) => [`${field}-error`, `Error: ${message}`])
    )
  )
}
