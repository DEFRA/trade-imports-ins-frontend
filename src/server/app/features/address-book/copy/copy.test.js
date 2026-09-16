import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../shared/copy-leaves.js'
import { FIELDS, FIELD_RULES } from '../fields.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const SAMPLE_ARGUMENTS = [1, 2, 3]

const textOf = (value) =>
  typeof value === 'function' ? value(...SAMPLE_ARGUMENTS) : value

const LOCALES = [
  ['en', copy],
  ['cy', cy]
]

describe('#copy', () => {
  it.each(LOCALES)(
    'Should hold a non-empty string or copy function at every %s leaf',
    (locale, bundle) => {
      for (const { path, value } of leaves(bundle)) {
        expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
        expect(
          textOf(value).trim().length,
          `${locale}: ${path} must render text`
        ).toBeGreaterThan(0)
      }
    }
  )

  it.each(LOCALES)(
    'Should label every %s form field, and no other',
    (_locale, bundle) => {
      expect(Object.keys(bundle.form.fields)).toEqual(FIELDS)
    }
  )

  it.each(LOCALES)(
    'Should carry a %s required message for every mandatory field and a maxLength message for every bounded one',
    (locale, bundle) => {
      for (const field of FIELDS) {
        const rule = FIELD_RULES[field]
        if (rule.required) {
          expect(
            typeof bundle.errors[field].required,
            `${locale}: errors.${field}.required`
          ).toBe('string')
        }
        if (rule.maxLength) {
          expect(
            typeof bundle.errors[field].maxLength,
            `${locale}: errors.${field}.maxLength`
          ).toBe('function')
        }
      }
    }
  )

  it('Should name the address in each success banner', () => {
    const addressName = 'Green Farm'

    expect(copy.successBanner.added(addressName)).toBe(
      'Green Farm added to your address book'
    )
    expect(copy.successBanner.updated(addressName)).toBe(
      'Green Farm updated in your address book'
    )
    expect(copy.successBanner.deleted(addressName)).toBe(
      'Green Farm deleted from your address book'
    )
  })

  it('Should carry the labels the form and summary specs pin, including the bare County row', () => {
    expect(copy.form.fields.county).toBe('County (optional)')
    expect(copy.view.countyRowLabel).toBe('County')
    expect(copy.form.fields.postcode).toBe('Postcode or Zip code')
    expect(copy.errors.name.maxLength(FIELD_RULES.name.maxLength)).toBe(
      'Name must be 255 characters or fewer'
    )
  })
})
