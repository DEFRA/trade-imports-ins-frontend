import { load } from 'cheerio'
import { expect } from 'vitest'

import { textOf, textsOf } from './rendered-text.js'

export const REQUIRED_MESSAGES = {
  name: 'Enter a name or organisation',
  postcode: 'Enter a postcode or Zip code',
  countryCode: 'Select a country',
  phone: 'Enter a phone number'
}

const summaryLinksOf = ($) =>
  $('.govuk-error-summary__list a')
    .map((_, link) => ({
      href: $(link).attr('href'),
      text: textOf($, link)
    }))
    .get()

export const expectSummaryLinks = (result) => {
  const summaryLinks = summaryLinksOf(load(result))

  for (const [field, message] of Object.entries(REQUIRED_MESSAGES)) {
    expect(summaryLinks).toContainEqual({ href: `#${field}`, text: message })
  }
}

export const expectSummaryAndFieldErrors = ($, errors) => {
  expect(summaryLinksOf($)).toEqual(
    errors.map(([field, message]) => ({ href: `#${field}`, text: message }))
  )
  expect(textsOf($, '.govuk-error-message')).toEqual(
    errors.map(([, message]) => `Error: ${message}`)
  )
}
