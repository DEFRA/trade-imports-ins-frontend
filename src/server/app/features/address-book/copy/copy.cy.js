// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
const SELECT_COUNTRY = 'Dewiswch wlad'

export const copy = {
  list: {
    title: 'Llyfr cyfeiriadau',
    intro:
      'Rheoli cyfeiriadau a ddefnyddir ar draws gwasanaethau mewnforio ac allforio.',
    search: {
      label: 'Chwilio cyfeiriadau',
      hint: 'Chwilio yn ôl enw, tref neu ddinas, cod post neu wlad',
      button: 'Chwilio',
      clear: 'Clirio’r chwiliad'
    },
    add: 'Ychwanegu cyfeiriad newydd',
    empty: 'Nid oes gennych unrhyw gyfeiriadau eto.',
    noMatchPrefix: 'Nid oes unrhyw gyfeiriadau yn cyfateb i',
    results: (from, to, total) => `Yn dangos ${from}-${to} o ${total}`,
    table: {
      name: 'Enw',
      address: 'Cyfeiriad',
      country: 'Gwlad',
      action: 'Cam gweithredu',
      view: 'Gweld'
    }
  },
  successBanner: {
    title: 'Llwyddiant',
    added: (name) => `${name} wedi’i ychwanegu at eich llyfr cyfeiriadau`,
    updated: (name) => `Cyfeiriad ${name} wedi’i ddiweddaru`,
    deleted: (name) => `Cyfeiriad ${name} wedi’i ddileu`,
    deletedUnnamed: 'Cyfeiriad wedi’i ddileu'
  },
  form: {
    addressHeading: 'Cyfeiriad',
    contactHeading: 'Manylion cyswllt',
    fields: {
      name: 'Enw neu sefydliad',
      addressLine1: 'Llinell gyfeiriad 1',
      addressLine2: 'Llinell gyfeiriad 2 (dewisol)',
      townOrCity: 'Tref neu ddinas',
      county: 'Sir (dewisol)',
      postcode: 'Cod post neu god zip',
      countryCode: 'Gwlad',
      phone: 'Rhif ffôn',
      email: 'Cyfeiriad e-bost'
    },
    phoneHint: 'Ar gyfer rhifau rhyngwladol, cynhwyswch god y wlad',
    countryPlaceholder: SELECT_COUNTRY
  },
  add: {
    title: 'Ychwanegu manylion cyfeiriad',
    save: 'Cadw a pharhau',
    cancel: 'Canslo a dychwelyd i’r llyfr cyfeiriadau',
    cancelToJourney: 'Canslo a dychwelyd i’r dudalen gyfeiriad',
    countryPlaceholder: 'Dewiswch un'
  },
  edit: {
    title: 'Golygu manylion cyfeiriad a manylion cyswllt',
    save: 'Cadw’r newidiadau',
    cancel: 'Canslo'
  },
  view: {
    edit: 'Golygu',
    delete: 'Dileu'
  },
  delete: {
    title: 'Dileu’r cyfeiriad hwn?',
    summaryAddress: 'Cyfeiriad',
    confirmation: 'Cadarnhewch eich bod am ddileu’r cyfeiriad hwn.',
    warning: 'Mae dileadau’n barhaol ac ni allwch ddadwneud hyn.',
    notApplicable: 'Amherthnasol',
    confirm: 'Ie, dileu',
    cancel: 'Na, canslo'
  },
  errors: {
    name: {
      required: 'Rhowch enw neu enw’r sefydliad',
      maxLength: (max) => `Rhaid i’r enw fod yn ${max} nod neu lai`
    },
    addressLine1: {
      required: 'Rhowch linell gyfeiriad 1',
      maxLength: (max) => `Rhaid i linell gyfeiriad 1 fod yn ${max} nod neu lai`
    },
    addressLine2: {
      maxLength: (max) => `Rhaid i linell gyfeiriad 2 fod yn ${max} nod neu lai`
    },
    townOrCity: {
      required: 'Rhowch dref neu ddinas',
      maxLength: (max) => `Rhaid i’r dref neu ddinas fod yn ${max} nod neu lai`
    },
    county: {
      maxLength: (max) => `Rhaid i’r sir fod yn ${max} nod neu lai`
    },
    postcode: {
      required: 'Rhowch god post neu god zip',
      maxLength: (max) => `Rhaid i’r cod post fod yn ${max} nod neu lai`
    },
    countryCode: {
      required: SELECT_COUNTRY
    },
    phone: {
      required: 'Rhowch rif ffôn',
      maxLength: (max) => `Rhaid i’r rhif ffôn fod yn ${max} nod neu lai`
    },
    email: {
      required: 'Rhowch gyfeiriad e-bost',
      format: 'Rhowch gyfeiriad e-bost yn y fformat cywir',
      maxLength: (max) => `Rhaid i’r cyfeiriad e-bost fod yn ${max} nod neu lai`
    }
  }
}
