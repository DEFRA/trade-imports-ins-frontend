// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
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
    updated: (name) => `${name} wedi’i ddiweddaru yn eich llyfr cyfeiriadau`,
    deleted: (name) => `${name} wedi’i ddileu o’ch llyfr cyfeiriadau`
  },
  form: {
    addressHeading: 'Rhowch fanylion y cyfeiriad',
    contactHeading: 'Rhowch fanylion cyswllt',
    fields: {
      name: 'Enw neu enw’r sefydliad',
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
    countryPlaceholder: 'Dewiswch wlad'
  },
  add: {
    title: 'Ychwanegu manylion cyfeiriad',
    save: 'Cadw a pharhau',
    cancel: 'Canslo a dychwelyd i’r llyfr cyfeiriadau'
  },
  edit: {
    title: 'Golygu manylion cyfeiriad',
    save: 'Cadw’r newidiadau',
    cancel: 'Canslo'
  },
  view: {
    edit: 'Golygu',
    delete: 'Dileu',
    countyRowLabel: 'Sir'
  },
  delete: {
    title: 'Dileu cyfeiriad',
    confirmPrefix: 'Ydych chi’n siŵr eich bod am ddileu',
    confirmSuffix: 'o’ch llyfr cyfeiriadau?',
    confirm: 'Ie, dileu’r cyfeiriad hwn',
    cancel: 'Canslo'
  },
  errors: {
    loadList: 'Aeth rhywbeth o’i le wrth lwytho eich llyfr cyfeiriadau',
    loadForm: 'Aeth rhywbeth o’i le wrth lwytho’r ffurflen',
    save: 'Aeth rhywbeth o’i le wrth gadw’r cyfeiriad',
    name: {
      required: 'Rhowch enw',
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
      required: 'Rhowch god post',
      maxLength: (max) => `Rhaid i’r cod post fod yn ${max} nod neu lai`
    },
    countryCode: {
      required: 'Rhowch wlad'
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
