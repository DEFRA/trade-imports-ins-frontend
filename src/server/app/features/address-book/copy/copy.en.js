const SELECT_COUNTRY = 'Select a country'
const ADD_A_NEW_ADDRESS = 'Add a new address'
const ADDRESS_TYPE = 'Address type'
const ADD_A_NEW_TRANSPORTER = 'Add a new transporter'
const NAME_OR_ORGANISATION = 'Name or organisation'
const ADDRESS_LINE_1 = 'Address line 1'
const ADDRESS_LINE_2 = 'Address line 2 (optional)'
const TOWN_OR_CITY = 'Town or city'
const COUNTY = 'County (optional)'
const POSTCODE = 'Postcode or Zip code'
const EMAIL_ADDRESS = 'Email address'
const PHONE_NUMBER = 'Phone number'
const PHONE_HINT = 'For international numbers include the country code'
const SAVE_AND_CONTINUE = 'Save and continue'
const ADDRESS_HEADING = 'Address'
const CONTACT_HEADING = 'Contact details'

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
      typeFilter: {
        label: 'Type',
        placeholder: 'Select one'
      }
    },
    add: ADD_A_NEW_ADDRESS,
    results: (from, to, total) => `Showing ${from}-${to} of ${total}`,
    noResults: 'Showing 0 of 0',
    tabsLabel: 'Address types',
    tabs: {
      ORIGIN_OR_CONSIGNOR: {
        label: 'Origin and Consignor',
        heading: 'Origin and Consignor addresses'
      },
      DESTINATION_CONSIGNEE_OR_IMPORTER: {
        label: 'Destination, Consignee and Importer',
        heading: 'Destination, Consignee and Importer addresses'
      },
      TRANSPORTER: {
        label: 'Transporter',
        heading: 'Transporter addresses'
      },
      BRANCH: {
        label: 'Branch',
        heading: 'Branch addresses'
      }
    },
    transporterTypes: {
      PRIVATE: 'Private',
      COMMERCIAL: 'Commercial'
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
      approvalNumber: 'Approval number',
      action: 'Action',
      view: 'View'
    }
  },
  notApplicable: 'Not applicable',
  successBanner: {
    title: 'Success',
    added: (name) => `${name} address added to your address book`,
    transporterAdded: (name) => `${name} added to your address book`,
    updated: (name) => `${name} address updated`,
    deleted: (name) => `${name} address deleted`,
    deletedUnnamed: 'Address deleted'
  },
  form: {
    addressHeading: ADDRESS_HEADING,
    contactHeading: CONTACT_HEADING,
    fields: {
      name: NAME_OR_ORGANISATION,
      addressLine1: ADDRESS_LINE_1,
      addressLine2: ADDRESS_LINE_2,
      townOrCity: TOWN_OR_CITY,
      county: COUNTY,
      postcode: POSTCODE,
      countryCode: 'Country',
      email: EMAIL_ADDRESS,
      phone: PHONE_NUMBER
    },
    phoneHint: PHONE_HINT,
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
      TRANSPORTER: { label: 'Transporter', hint: 'Private, Commercial' },
      BRANCH: { label: 'Branch', hint: 'Branch address' }
    },
    continue: 'Continue'
  },
  transporterType: {
    caption: ADD_A_NEW_TRANSPORTER,
    title: 'Choose a transporter type',
    warning:
      'Check the transporter list before adding new transporters to avoid duplicates.',
    options: {
      PRIVATE: { label: 'Private transporter' },
      COMMERCIAL: {
        label: 'Commercial',
        hint: 'This can only be a commercial transporter from Northern Ireland.'
      }
    },
    continue: 'Continue'
  },
  privateTransporterForm: {
    caption: ADD_A_NEW_TRANSPORTER,
    title: 'Add a private transporter',
    addressHeading: ADDRESS_HEADING,
    contactHeading: CONTACT_HEADING,
    fields: {
      name: NAME_OR_ORGANISATION,
      addressLine1: ADDRESS_LINE_1,
      addressLine2: ADDRESS_LINE_2,
      townOrCity: TOWN_OR_CITY,
      county: COUNTY,
      postcode: POSTCODE,
      countryCode: 'Country',
      email: EMAIL_ADDRESS,
      phone: PHONE_NUMBER
    },
    phoneHint: PHONE_HINT,
    countryPlaceholder: SELECT_COUNTRY,
    save: SAVE_AND_CONTINUE
  },
  commercialTransporterForm: {
    caption: ADD_A_NEW_TRANSPORTER,
    title: 'Add a commercial transporter',
    addressHeading: ADDRESS_HEADING,
    contactHeading: CONTACT_HEADING,
    country: 'Northern Ireland',
    fields: {
      name: NAME_OR_ORGANISATION,
      approvalNumber: 'Approval number',
      addressLine1: ADDRESS_LINE_1,
      addressLine2: ADDRESS_LINE_2,
      townOrCity: TOWN_OR_CITY,
      county: COUNTY,
      postcode: POSTCODE,
      email: EMAIL_ADDRESS,
      phone: PHONE_NUMBER
    },
    phoneHint: PHONE_HINT,
    save: SAVE_AND_CONTINUE
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
    save: SAVE_AND_CONTINUE,
    saveAndSelect: 'Save and select',
    saveAndReturnToAddressPage: 'Save and return to address page',
    cancelAndReturnToAddressBook: 'Cancel and return to address book',
    cancelAndReturnToAddressPage: 'Cancel and return to address page',
    cancelAndReturnToHub: 'Cancel and return to hub'
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
    confirm: 'Yes, delete',
    cancel: 'No, cancel'
  },
  errors: {
    addressType: {
      required: 'Select an address type'
    },
    transporterType: {
      required: 'Select what kind of transporter it is'
    },
    approvalNumber: {
      required: 'Enter the approval number',
      maxLength: (max) => `Approval number must be ${max} characters or fewer`,
      notApplicable: 'A private transporter must not have an approval number'
    },
    countryFixed: 'A commercial transporter must be in Northern Ireland',
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
      maxLength: (max) => `Phone number must be ${max} characters or fewer`
    },
    email: {
      required: 'Enter an email address',
      format: 'Enter an email address in the correct format',
      maxLength: (max) => `Email address must be ${max} characters or fewer`
    }
  }
}
