import { expect } from 'vitest'

import { GB_COUNTRY } from '../../app/features/address-book/address-countries.js'
import { copy } from '../../app/features/address-book/copy/copy.en.js'
import {
  COUNTRY_OPTIONS,
  SELECTED_COUNTRY_OPTION
} from './address-book-requests.js'
import { textsOf } from './rendered-text.js'

export const expectUnitedKingdomAloneSelected = ($) => {
  expect(textsOf($, COUNTRY_OPTIONS)).toEqual([GB_COUNTRY.name])
  expect($(SELECTED_COUNTRY_OPTION).attr('value')).toBe(GB_COUNTRY.code)
}

export const expectPlaceholderThenCountriesNoneSelected = ($, countryNames) => {
  expect(textsOf($, COUNTRY_OPTIONS)).toEqual([
    copy.form.countryPlaceholder,
    ...countryNames
  ])
  expect($(SELECTED_COUNTRY_OPTION)).toHaveLength(0)
}
