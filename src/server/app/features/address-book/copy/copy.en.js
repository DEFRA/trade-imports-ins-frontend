const SELECT_COUNTRY = 'Select a country'
const ADD_A_NEW_ADDRESS = 'Add a new address'
const ADDRESS_TYPE = 'Address type'

export const copy = {
  list: {
    title: 'Address book',
    intro: 'Manage your addresses for use across all your import notifications',
    search: {
      summary: 'Filter addresses',
      label: 'Search',
      hint: 'Search by name, address or country',
      button: 'Search',
      clear: 'Clear search',
      type: {
        label: 'Type',
        placeholder: 'Select one'
      }
    },
    add: ADD_A_NEW_ADDRESS,
    results: (from, to, total) => `Showing ${from}-${to} of ${total}`,
    noResults: 'Showing 0 of 0',
    tabsLabel: 'Address types',
    tabs: {
      originOrConsignor: {
        label: 'Origin and Consignor',
        heading: 'Origin and Consignor addresses'
      },
      destinationConsigneeOrImporter: {
        label: 'Destination, Consignee and Importer',
        heading: 'Destination, Consignee and Importer addresses'
      },
      branch: {
        label: 'Branch',
        heading: 'Branch addresses'
      }
    },
    roles: {
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
    },
    table: {
      name: 'Name',
      type: 'Type',
      address: 'Address',
      country: 'Country',
      action: 'Action',
      view: 'View'
    }
  },
  successBanner: {
    title: 'Success',
    added: (name) => `${name} address added to your address book`,
    updated: (name) => `${name} address updated`,
    deleted: (name) => `${name} address deleted`,
    deletedUnnamed: 'Address deleted'
  },
  form: {
    addressHeading: 'Address',
    contactHeading: 'Contact details',
    fields: {
      name: 'Name or organisation',
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2 (optional)',
      townOrCity: 'Town or city',
      county: 'County (optional)',
      postcode: 'Postcode or Zip code',
      countryCode: 'Country',
      email: 'Email address',
      phone: 'Phone number'
    },
    phoneHint: 'For international numbers include the country code',
    countryPlaceholder: SELECT_COUNTRY
  },
  addressType: {
    caption: ADD_A_NEW_ADDRESS,
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
  },
  roles: {
    journeyLegend: 'What else should this address be used for?',
    journeyHint: (roleLabel) =>
      `This address is being added as ${/^[AEIOU]/.test(roleLabel) ? 'an' : 'a'} ${roleLabel} address. Select any other roles or addresses this address should be used for.`,
    legendByAddressType: {
      ORIGIN_OR_CONSIGNOR: 'What can this address be used for?',
      DESTINATION_CONSIGNEE_OR_IMPORTER: ADDRESS_TYPE,
      BRANCH: ADDRESS_TYPE
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
  },
  add: {
    title: 'Add address and contact details',
    caption: 'Add new address',
    save: 'Save and continue',
    saveAndSelect: 'Save and select',
    saveAndReturnToAddressPage: 'Save and return to address page',
    cancel: 'Cancel and return to address book',
    cancelAndReturnToAddressPage: 'Cancel and return to address page',
    cancelToHub: 'Cancel and return to hub'
  },
  edit: {
    title: 'Edit address and contact details',
    save: 'Save changes',
    cancel: 'Cancel'
  },
  view: {
    edit: 'Edit',
    delete: 'Delete'
  },
  delete: {
    title: 'Delete this address?',
    summaryAddress: 'Address',
    confirmation: 'Confirm that you want to delete this address.',
    warning: 'Deletions are permanent and you cannot undo this.',
    notApplicable: 'Not applicable',
    confirm: 'Yes, delete',
    cancel: 'No, cancel'
  },
  errors: {
    addressType: {
      required: 'Select an address type'
    },
    roles: {
      required: 'Select what this address can be used for'
    },
    name: {
      required: 'Enter a name or organisation',
      maxLength: (max) => `Name must be ${max} characters or fewer`
    },
    addressLine1: {
      required: 'Enter address line 1',
      maxLength: (max) => `Address line 1 must be ${max} characters or fewer`
    },
    addressLine2: {
      maxLength: (max) => `Address line 2 must be ${max} characters or fewer`
    },
    townOrCity: {
      required: 'Enter a town or city',
      maxLength: (max) => `Town or city must be ${max} characters or fewer`
    },
    county: {
      maxLength: (max) => `County must be ${max} characters or fewer`
    },
    postcode: {
      required: 'Enter a postcode or Zip code',
      maxLength: (max) => `Postcode must be ${max} characters or fewer`
    },
    countryCode: {
      required: SELECT_COUNTRY
    },
    phone: {
      required: 'Enter a phone number',
      maxLength: (max) => `Telephone number must be ${max} characters or fewer`
    },
    email: {
      required: 'Enter an email address',
      format: 'Enter an email address in the correct format',
      maxLength: (max) => `Email address must be ${max} characters or fewer`
    }
  }
}
