import { expect } from 'vitest'

import { COUNTRY_OPTIONS, SELECTED_COUNTRY } from './address-book-requests.js'

const countryOptionTexts = ($) =>
  $(COUNTRY_OPTIONS)
    .map((_, option) => $(option).text().trim())
    .get()

export const expectUnitedKingdomAloneSelected = ($) => {
  expect(countryOptionTexts($)).toEqual(['United Kingdom'])
  expect($(SELECTED_COUNTRY).attr('value')).toBe('GB')
}

export const expectPlaceholderThenCountriesNoneSelected = ($, countryNames) => {
  expect(countryOptionTexts($)).toEqual(['Select a country', ...countryNames])
  expect($(SELECTED_COUNTRY)).toHaveLength(0)
}
