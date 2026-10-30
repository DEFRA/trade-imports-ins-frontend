import { expect } from 'vitest'

import { GB_COUNTRY } from '../../app/features/address-book/address-countries.js'
import { COUNTRY_OPTIONS, SELECTED_COUNTRY } from './address-book-requests.js'
import { COUNTRY_PLACEHOLDER } from './country-placeholder.js'

const countryOptionTexts = ($) =>
  $(COUNTRY_OPTIONS)
    .map((_, option) => $(option).text().trim())
    .get()

export const expectUnitedKingdomAloneSelected = ($) => {
  expect(countryOptionTexts($)).toEqual([GB_COUNTRY.name])
  expect($(SELECTED_COUNTRY).attr('value')).toBe(GB_COUNTRY.code)
}

export const expectPlaceholderThenCountriesNoneSelected = ($, countryNames) => {
  expect(countryOptionTexts($)).toEqual([COUNTRY_PLACEHOLDER, ...countryNames])
  expect($(SELECTED_COUNTRY)).toHaveLength(0)
}
