import { expect } from 'vitest'

export const REQUIRED_MESSAGES = {
  name: 'Enter a name or organisation name',
  postcode: 'Enter a postcode or Zip code',
  countryCode: 'Select a country',
  phone: 'Enter a phone number'
}

// The summary link, not the field or the select's placeholder, carries the message.
export const expectSummaryLinks = (result) => {
  for (const [field, message] of Object.entries(REQUIRED_MESSAGES)) {
    expect(result).toMatch(
      new RegExp(String.raw`href="#${field}"[^>]*>\s*${message}\s*<`)
    )
  }
}
