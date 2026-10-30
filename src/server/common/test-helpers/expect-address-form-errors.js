import { load } from 'cheerio'
import { expect } from 'vitest'

export const REQUIRED_MESSAGES = {
  name: 'Enter a name or organisation',
  postcode: 'Enter a postcode or Zip code',
  countryCode: 'Select a country',
  phone: 'Enter a phone number'
}

const trimmedTextOf = ($, element) =>
  $(element).text().trim().replaceAll(/\s+/g, ' ')

const summaryLinksOf = ($) =>
  $('.govuk-error-summary__list a')
    .map((_, link) => ({
      href: $(link).attr('href'),
      text: trimmedTextOf($, link)
    }))
    .get()

export const expectSummaryLinks = (result) => {
  const summaryLinks = summaryLinksOf(load(result))

  for (const [field, message] of Object.entries(REQUIRED_MESSAGES)) {
    expect(summaryLinks).toContainEqual({ href: `#${field}`, text: message })
  }
}

export const expectSummaryAndFieldErrors = ($, errors) => {
  const fieldMessages = $('.govuk-error-message')
    .map((_, message) => trimmedTextOf($, message))
    .get()

  expect(summaryLinksOf($)).toEqual(
    errors.map(([field, message]) => ({ href: `#${field}`, text: message }))
  )
  expect(fieldMessages).toEqual(
    errors.map(([, message]) => `Error: ${message}`)
  )
}
