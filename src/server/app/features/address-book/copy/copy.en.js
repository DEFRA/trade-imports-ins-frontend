export const copy = {
  list: {
    title: 'Address book',
    intro: 'Manage addresses used across import and export services.',
    search: {
      label: 'Search addresses',
      hint: 'Search by name, town or city, postcode or country',
      button: 'Search',
      clear: 'Clear search'
    },
    add: 'Add a new address',
    empty: 'You have no addresses yet.',
    noMatchPrefix: 'No addresses match',
    results: (from, to, total) => `Showing ${from}-${to} of ${total}`,
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
    added: (name) => `${name} added to your address book`,
    updated: (name) => `${name} updated in your address book`,
    deleted: (name) => `${name} deleted from your address book`
  },
  form: {
    addressHeading: 'Enter address details',
    contactHeading: 'Enter contact details',
    fields: {
      name: 'Name or organisation name',
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
    countryPlaceholder: 'Select a country'
  },
  add: {
    title: 'Add address details',
    save: 'Save and continue',
    cancel: 'Cancel and return to address book',
    cancelToJourney: 'Cancel and return to address page'
  },
  edit: {
    title: 'Edit address details',
    save: 'Save changes',
    cancel: 'Cancel'
  },
  view: {
    edit: 'Edit',
    delete: 'Delete',
    countyRowLabel: 'County'
  },
  delete: {
    title: 'Delete address',
    confirmPrefix: 'Are you sure you want to delete',
    confirmSuffix: 'from your address book?',
    confirm: 'Yes, delete this address',
    cancel: 'Cancel'
  },
  errors: {
    name: {
      required: 'Enter a name',
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
      required: 'Enter a postcode',
      maxLength: (max) => `Postcode must be ${max} characters or fewer`
    },
    countryCode: {
      required: 'Enter a country'
    },
    phone: {
      required: 'Enter a telephone number',
      maxLength: (max) => `Telephone number must be ${max} characters or fewer`
    },
    email: {
      required: 'Enter an email address',
      format: 'Enter an email address in the correct format',
      maxLength: (max) => `Email address must be ${max} characters or fewer`
    }
  }
}
