import { load } from 'cheerio'
import { expect } from 'vitest'

import {
  AUTOCOMPLETE_BY_FIELD,
  FIELDS_WITHOUT_AUTOCOMPLETE
} from './address-form-autocomplete.js'

export const expectAddressFormAutocomplete = (result) => {
  const $ = load(result)

  for (const [id, autocomplete] of Object.entries(AUTOCOMPLETE_BY_FIELD)) {
    expect($(`#${id}`).attr('autocomplete'), id).toBe(autocomplete)
  }
  for (const id of FIELDS_WITHOUT_AUTOCOMPLETE) {
    expect($(`#${id}:not([autocomplete])`), id).toHaveLength(1)
  }
}
