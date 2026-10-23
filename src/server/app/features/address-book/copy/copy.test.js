import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../shared/copy-leaves.js'
import { FIELDS, FIELD_RULES, isRequiredField } from '../fields.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const textOf = (value) => {
  const sampleArguments = [1, 2, 3]

  return typeof value === 'function' ? value(...sampleArguments) : value
}

const ADDRESS_NAME = 'Green Farm'

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

  it('Should word the add-details form with its name label, country placeholder and section headings', () => {
    expect(copy.form.addressHeading).toBe('Address')
    expect(copy.form.contactHeading).toBe('Contact details')
    expect(copy.form.fields.name).toBe('Name or organisation')
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
        if (isRequiredField(field)) {
          expect(
            typeof bundle.errors[field].required,
            `${locale}: errors.${field}.required`
          ).toBe('string')
        }
        if (FIELD_RULES[field].maxLength) {
          expect(
            typeof bundle.errors[field].maxLength,
            `${locale}: errors.${field}.maxLength`
          ).toBe('function')
        }
      }
    }
  )

  it('Should name the address in each success banner', () => {
    expect(copy.successBanner.added(ADDRESS_NAME)).toBe(
      'Green Farm added to your address book'
    )
    expect(copy.successBanner.updated(ADDRESS_NAME)).toBe(
      'Green Farm address updated'
    )
    expect(copy.successBanner.deleted(ADDRESS_NAME)).toBe(
      'Green Farm address deleted'
    )
    expect(copy.successBanner.deletedUnnamed).toBe('Address deleted')
  })

  it('Should word the delete confirmation with its summary label, warning, fallback and Yes, delete and No, cancel', () => {
    expect(copy.delete.summaryAddress).toBe('Address')
    expect(copy.delete.confirmation).toBe(
      'Confirm that you want to delete this address.'
    )
    expect(copy.delete.warning).toBe(
      'Deletions are permanent and you cannot undo this.'
    )
    expect(copy.delete.notApplicable).toBe('Not applicable')
    expect(copy.delete.confirm).toBe('Yes, delete')
    expect(copy.delete.cancel).toBe('No, cancel')
  })

  it('Should label the optional county, the postcode and the delete heading, and cap the name at 255 characters', () => {
    expect(copy.form.fields.county).toBe('County (optional)')
    expect(copy.delete.title).toBe('Delete this address?')
    expect(copy.form.fields.postcode).toBe('Postcode or Zip code')
    expect(copy.errors.name.maxLength(FIELD_RULES.name.maxLength)).toBe(
      'Name must be 255 characters or fewer'
    )
  })

  it('Should name the address in the Welsh deleted banner', () => {
    const welsh = cy.successBanner.deleted(ADDRESS_NAME)

    expect(welsh).toContain(ADDRESS_NAME)
    expect(welsh).not.toBe(copy.successBanner.deleted(ADDRESS_NAME))
  })

  it('Should carry a Welsh edit page title and updated banner that name the address and differ from the English', () => {
    const welshBanner = cy.successBanner.updated(ADDRESS_NAME)

    expect(cy.edit.title).not.toBe(copy.edit.title)
    expect(welshBanner).toContain(ADDRESS_NAME)
    expect(welshBanner).not.toBe(copy.successBanner.updated(ADDRESS_NAME))
  })

  it('Should carry the Welsh for the delete page heading and confirm button', () => {
    expect(cy.delete.title).toBe('Dileu’r cyfeiriad hwn?')
    expect(cy.delete.confirm).toBe('Ie, dileu')
  })

  it('Should ask for the missing name, postcode, country or phone in its required message', () => {
    expect(copy.errors.name.required).toBe('Enter a name or organisation name')
    expect(copy.errors.postcode.required).toBe('Enter a postcode or Zip code')
    expect(copy.errors.countryCode.required).toBe('Select a country')
    expect(copy.errors.phone.required).toBe('Enter a phone number')
  })
})
