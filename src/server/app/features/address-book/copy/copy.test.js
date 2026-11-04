import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../shared/copy-leaves.js'
import { textOf } from '../../../shared/copy-leaves.test-support.js'
import { FIELDS, FIELD_RULES, isRequiredField } from '../fields.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

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

  it('Should word the add-details form with its section headings, country placeholder and cancel link', () => {
    expect(copy.form.addressHeading).toBe('Address')
    expect(copy.form.contactHeading).toBe('Contact details')
    expect(copy.form.countryPlaceholder).toBe('Select a country')
    expect(copy.add.cancel).toBe('Cancel and return to address book')
  })

  it('Should word the add page title and caption', () => {
    expect(copy.add.title).toBe('Add address and contact details')
    expect(copy.add.caption).toBe('Add new address')
  })

  it('Should word the uses question with its legend per address type, hint, one label per use and error', () => {
    expect(copy.uses).toEqual({
      journeyLegend: 'What else should this address be used for?',
      journeyHint: expect.any(Function),
      legendByAddressType: {
        ORIGIN_OR_CONSIGNOR: 'What can this address be used for?',
        DESTINATION_CONSIGNEE_OR_IMPORTER: 'Address type',
        BRANCH: 'Address type'
      },
      hint: 'Select where this address can be used',
      options: {
        PLACE_OF_ORIGIN: { label: 'Place of origin' },
        CONSIGNOR: { label: 'Consignor' },
        CONSIGNEE: { label: 'Consignee' },
        IMPORTER: { label: 'Importer' },
        PLACE_OF_DESTINATION: { label: 'Place of destination' },
        BRANCH_ADDRESS: { label: 'Branch address' }
      }
    })
    expect(copy.errors.uses.required).toBe(
      'Select what this address can be used for'
    )
  })

  it('Should word the journey-mode add actions', () => {
    expect(copy.add.saveAndSelect).toBe('Save and select')
    expect(copy.add.saveAndReturnToAddressPage).toBe(
      'Save and return to address page'
    )
    expect(copy.add.cancelToHub).toBe('Cancel and return to hub')
  })

  it('Should word the Welsh add page title, caption and journey-mode actions', () => {
    const {
      title,
      caption,
      saveAndSelect,
      saveAndReturnToAddressPage,
      cancelToHub
    } = cy.add

    expect({
      title,
      caption,
      saveAndSelect,
      saveAndReturnToAddressPage,
      cancelToHub
    }).toEqual({
      title: 'Ychwanegu manylion cyfeiriad a manylion cyswllt',
      caption: 'Ychwanegu cyfeiriad newydd',
      saveAndSelect: 'Cadw a dewis',
      saveAndReturnToAddressPage: 'Cadw a dychwelyd i’r dudalen gyfeiriad',
      cancelToHub: 'Canslo a dychwelyd i’r hyb'
    })
  })

  it('Should word the list intro, filter disclosure, search field and hint, Type select label and placeholder, search button and empty results line', () => {
    expect(copy.list.intro).toBe(
      'Manage your addresses for use across all your import notifications'
    )
    expect(copy.list.search).toEqual({
      summary: 'Filter addresses',
      label: 'Search',
      hint: 'Search by name, address or country',
      button: 'Search',
      type: {
        label: 'Type',
        placeholder: 'Select one'
      }
    })
    expect(copy.list.noResults).toBe('Showing 0 of 0')
  })

  it('Should label the English form fields with the labels the design sets', () => {
    expect(copy.form.fields).toEqual({
      name: 'Name or organisation',
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2 (optional)',
      townOrCity: 'Town or city',
      county: 'County (optional)',
      postcode: 'Postcode or Zip code',
      countryCode: 'Country',
      phone: 'Phone number',
      email: 'Email address'
    })
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
      'Green Farm address added to your address book'
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

  it('Should word the delete heading and cap the name at 255 characters', () => {
    expect(copy.delete.title).toBe('Delete this address?')
    expect(copy.errors.name.maxLength(FIELD_RULES.name.maxLength)).toBe(
      'Name must be 255 characters or fewer'
    )
  })

  it('Should word the Welsh added, updated, deleted and unnamed deleted banners', () => {
    expect(cy.successBanner.added(ADDRESS_NAME)).toBe(
      'Cyfeiriad Green Farm wedi’i ychwanegu at eich llyfr cyfeiriadau'
    )
    expect(cy.successBanner.updated(ADDRESS_NAME)).toBe(
      'Cyfeiriad Green Farm wedi’i ddiweddaru'
    )
    expect(cy.successBanner.deleted(ADDRESS_NAME)).toBe(
      'Cyfeiriad Green Farm wedi’i ddileu'
    )
    expect(cy.successBanner.deletedUnnamed).toBe('Cyfeiriad wedi’i ddileu')
  })

  it('Should carry the Welsh edit page title', () => {
    expect(cy.edit.title).toBe('Golygu manylion cyfeiriad a manylion cyswllt')
  })

  it('Should carry the Welsh for the delete page heading and confirm button', () => {
    expect(cy.delete.title).toBe('Dileu’r cyfeiriad hwn?')
    expect(cy.delete.confirm).toBe('Ie, dileu')
  })

  it('Should ask for the missing name, postcode, country or phone in its required message', () => {
    expect(copy.errors.name.required).toBe('Enter a name or organisation')
    expect(copy.errors.postcode.required).toBe('Enter a postcode or Zip code')
    expect(copy.errors.countryCode.required).toBe('Select a country')
    expect(copy.errors.phone.required).toBe('Enter a phone number')
  })
})

describe('#copy of the list page', () => {
  it('Should word the Welsh list title, intro, search, add link, results lines, tabs, use labels, table headings and View link', () => {
    expect(
      leaves(cy.list).map(({ path, value }) => [path, textOf(value)])
    ).toEqual([
      ['title', 'Llyfr cyfeiriadau'],
      [
        'intro',
        'Rheoli eich cyfeiriadau i’w defnyddio ar draws eich holl hysbysiadau mewnforio'
      ],
      ['search.summary', 'Hidlo cyfeiriadau'],
      ['search.label', 'Chwilio'],
      ['search.hint', 'Chwilio yn ôl enw, cyfeiriad neu wlad'],
      ['search.button', 'Chwilio'],
      ['search.type.label', 'Math'],
      ['search.type.placeholder', 'Dewiswch un'],
      ['add', 'Ychwanegu cyfeiriad newydd'],
      ['results', 'Yn dangos 1-2 o 3'],
      ['noResults', 'Yn dangos 0 o 0'],
      ['tabsLabel', 'Mathau o gyfeiriad'],
      ['tabs.originOrConsignor.label', 'Tarddiad ac Anfonwr'],
      ['tabs.originOrConsignor.heading', 'Cyfeiriadau tarddiad ac anfonwr'],
      [
        'tabs.destinationConsigneeOrImporter.label',
        'Cyrchfan, Derbynnydd a Mewnforiwr'
      ],
      [
        'tabs.destinationConsigneeOrImporter.heading',
        'Cyfeiriadau cyrchfan, derbynnydd a mewnforiwr'
      ],
      ['tabs.branch.label', 'Cangen'],
      ['tabs.branch.heading', 'Cyfeiriadau cangen'],
      ['uses.PLACE_OF_ORIGIN.columnLabel', 'Man tarddiad'],
      ['uses.PLACE_OF_ORIGIN.optionLabel', 'Man Tarddiad'],
      ['uses.CONSIGNOR.columnLabel', 'Anfonwr'],
      ['uses.CONSIGNOR.optionLabel', 'Anfonwr'],
      ['uses.CONSIGNEE.columnLabel', 'Derbynnydd'],
      ['uses.CONSIGNEE.optionLabel', 'Derbynnydd'],
      ['uses.IMPORTER.columnLabel', 'Mewnforiwr'],
      ['uses.IMPORTER.optionLabel', 'Mewnforiwr'],
      ['uses.PLACE_OF_DESTINATION.columnLabel', 'Man cyrchfan'],
      ['uses.PLACE_OF_DESTINATION.optionLabel', 'Man Cyrchfan'],
      ['uses.BRANCH_ADDRESS.columnLabel', 'Cangen'],
      ['uses.BRANCH_ADDRESS.optionLabel', 'Cyfeiriad Cangen'],
      ['table.name', 'Enw'],
      ['table.type', 'Math'],
      ['table.address', 'Cyfeiriad'],
      ['table.country', 'Gwlad'],
      ['table.action', 'Cam gweithredu'],
      ['table.view', 'Gweld']
    ])
  })

  it('Should word the tab labels, panel headings, Type heading and use labels', () => {
    expect(copy.list.tabs).toEqual({
      originOrConsignor: {
        label: 'Origin and Consignor',
        heading: 'Origin and Consignor addresses'
      },
      destinationConsigneeOrImporter: {
        label: 'Destination, Consignee and Importer',
        heading: 'Destination, Consignee and Importer addresses'
      },
      branch: { label: 'Branch', heading: 'Branch addresses' }
    })
    expect(copy.list.table.type).toBe('Type')
    expect(copy.list.uses).toEqual({
      PLACE_OF_ORIGIN: {
        columnLabel: 'Place of origin',
        optionLabel: 'Place of Origin'
      },
      CONSIGNOR: { columnLabel: 'Consignor', optionLabel: 'Consignor' },
      CONSIGNEE: { columnLabel: 'Consignee', optionLabel: 'Consignee' },
      IMPORTER: { columnLabel: 'Importer', optionLabel: 'Importer' },
      PLACE_OF_DESTINATION: {
        columnLabel: 'Place of destination',
        optionLabel: 'Place of Destination'
      },
      BRANCH_ADDRESS: {
        columnLabel: 'Branch',
        optionLabel: 'Branch Address'
      }
    })
  })
})

describe('#copy of the address type page', () => {
  it('Should word the caption, heading, each address type with its hint, the Continue button and the missing-type message', () => {
    expect(copy.addressType).toEqual({
      caption: 'Add a new address',
      title: 'Choose an address type',
      options: {
        ORIGIN_OR_CONSIGNOR: {
          label: 'Origin or Consignor',
          hint: 'Place of origin, Consignor'
        },
        DESTINATION_CONSIGNEE_OR_IMPORTER: {
          label: 'Destination, Consignee or Importer',
          hint: 'Place of destination, Consignee, Importer'
        },
        BRANCH: { label: 'Branch', hint: 'Branch address' }
      },
      continue: 'Continue'
    })
    expect(copy.errors.addressType.required).toBe('Select an address type')
  })
})

describe('#copy.uses journey question', () => {
  const HINT_TAIL =
    'Select any other roles or addresses this address should be used for.'

  it('Should word the legend', () => {
    expect(copy.uses.journeyLegend).toBe(
      'What else should this address be used for?'
    )
  })

  it.each([
    ['Consignor', 'a'],
    ['Importer', 'an']
  ])(
    'Should word the hint for the %s role with the article %s',
    (roleLabel, article) => {
      expect(copy.uses.journeyHint(roleLabel)).toBe(
        `This address is being added as ${article} ${roleLabel} address. ${HINT_TAIL}`
      )
    }
  )

  it('Should word the Welsh legend and a hint naming the Welsh role', () => {
    expect(cy.uses.journeyLegend).toBe(
      'Ar gyfer beth arall y dylid defnyddio’r cyfeiriad hwn?'
    )
    expect(cy.uses.journeyHint('Mewnforiwr')).toBe(
      'Mae’r cyfeiriad hwn yn cael ei ychwanegu fel cyfeiriad Mewnforiwr. Dewiswch unrhyw rolau neu gyfeiriadau eraill y dylid defnyddio’r cyfeiriad hwn ar eu cyfer.'
    )
  })
})
