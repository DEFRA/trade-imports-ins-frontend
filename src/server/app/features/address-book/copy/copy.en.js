const SELECT_COUNTRY = 'Select a country'

export const copy = {
  list: {
    title: 'Address book',
    intro: 'Manage your addresses for use across all your import notifications',
    search: {
      summary: 'Filter addresses',
      label: 'Search',
      hint: 'Search by name, address or country',
      button: 'Search',
      clear: 'Clear search'
    },
    add: 'Add a new address',
    results: (from, to, total) => `Showing ${from}-${to} of ${total}`,
    noResults: 'Showing 0 of 0',
    table: {
      name: 'Name',
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
      phone: 'Phone number',
      email: 'Email address'
    },
    phoneHint: 'For international numbers include the country code',
    countryPlaceholder: SELECT_COUNTRY
  },
  add: {
    title: 'Add address and contact details',
    caption: 'Add new address',
    save: 'Save and continue',
    saveAndSelect: 'Save and select',
    saveAndReturnToAddressPage: 'Save and return to address page',
    cancel: 'Cancel and return to address book',
    cancelToJourney: 'Cancel and return to address page',
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
