import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../shared/copy-leaves.js'
import { FIELDS, FIELD_RULES } from '../fields.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const SAMPLE_ARGUMENTS = [1, 2, 3]

const textOf = (value) =>
  typeof value === 'function' ? value(...SAMPLE_ARGUMENTS) : value

const MACHINE_DRAFT =
  '// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.'

const SAMPLE_NAME = 'Green Farm'

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

  it('Should word the add-details form with its own name label, country placeholder and section headings', () => {
    expect(copy.form.addressHeading).toBe('Address')
    expect(copy.form.contactHeading).toBe('Contact details')
    expect(copy.add.nameLabel).toBe('Name or organisation')
    expect(copy.form.fields.name).toBe('Name or organisation name')
    expect(copy.add.countryPlaceholder).toBe('Select one')
    expect(copy.add.cancel).toBe('Cancel and return to address book')
  })

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
      'Green Farm address deleted'
    )
    expect(copy.successBanner.deletedUnnamed).toBe('Address deleted')
  })

  it('Should word the delete confirmation with its summary label, warning, fallback and Yes, delete and No, cancel', () => {
    expect(copy.delete.summaryAddress).toBe('Address')
    expect(copy.delete.confirmation).toBe(
      'Confirm that you want to delete this address.'
    )
    expect(copy.delete.warning).toBe('This action cannot be undone.')
    expect(copy.delete.notApplicable).toBe('Not applicable')
    expect(copy.delete.confirm).toBe('Yes, delete')
    expect(copy.delete.cancel).toBe('No, cancel')
  })

  it('Should carry the labels the form and summary specs pin', () => {
    expect(copy.form.fields.county).toBe('County (optional)')
    expect(copy.delete.title).toBe('Delete this address?')
    expect(copy.form.fields.postcode).toBe('Postcode or Zip code')
    expect(copy.errors.name.maxLength(FIELD_RULES.name.maxLength)).toBe(
      'Name must be 255 characters or fewer'
    )
  })

  it('Should name the address in the Welsh deleted banner', () => {
    const welsh = cy.successBanner.deleted(SAMPLE_NAME)

    expect(welsh).toContain(SAMPLE_NAME)
    expect(welsh).not.toBe(copy.successBanner.deleted(SAMPLE_NAME))
  })

  it('Should carry the Welsh for the delete page heading and confirm button', () => {
    expect(cy.delete.title).toBe('Dileu’r cyfeiriad hwn?')
    expect(cy.delete.confirm).toBe('Ie, dileu')
  })

  it('Should mark the Welsh as a machine draft on its first line', () => {
    const source = readFileSync(new URL('copy.cy.js', import.meta.url), 'utf8')

    expect(source.split('\n')[0]).toBe(MACHINE_DRAFT)
  })

  it('Should ask for the missing name, postcode, country or phone in its required message', () => {
    expect(copy.errors.name.required).toBe('Enter a name or organisation name')
    expect(copy.errors.postcode.required).toBe('Enter a postcode or Zip code')
    expect(copy.errors.countryCode.required).toBe('Select a country')
    expect(copy.errors.phone.required).toBe('Enter a phone number')
  })
})
