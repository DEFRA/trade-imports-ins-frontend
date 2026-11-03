import { load } from 'cheerio'
import { expect } from 'vitest'

import { AUTOCOMPLETE_BY_FIELD } from './address-form-autocomplete.js'

export const expectAddressFormAutocomplete = (result) => {
  const $ = load(result)

  for (const [id, autocomplete] of Object.entries(AUTOCOMPLETE_BY_FIELD)) {
    expect($(`#${id}`).attr('autocomplete'), id).toBe(autocomplete)
  }
  for (const id of ['name', 'county', 'countryCode']) {
    expect($(`#${id}:not([autocomplete])`), id).toHaveLength(1)
  }
}
