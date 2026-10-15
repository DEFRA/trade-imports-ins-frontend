// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
const SELECT_COUNTRY = 'Dewiswch wlad'
const ADD_NEW_ADDRESS = 'Ychwanegu cyfeiriad newydd'

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
    add: ADD_NEW_ADDRESS,
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
    addressHeading: 'Cyfeiriad',
    contactHeading: 'Manylion cyswllt',
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
    countryPlaceholder: SELECT_COUNTRY
  },
  add: {
    title: 'Ychwanegu manylion cyfeiriad a chyswllt',
    caption: ADD_NEW_ADDRESS,
    save: 'Cadw a pharhau',
    cancel: 'Canslo a dychwelyd i’r llyfr cyfeiriadau',
    cancelToJourney: 'Canslo a dychwelyd i’r dudalen gyfeiriad',
    nameLabel: 'Enw neu sefydliad',
    countryPlaceholder: 'Dewiswch un'
  },
  addressType: {
    caption: ADD_NEW_ADDRESS,
    title: 'Dewis math o gyfeiriad',
    continue: 'Parhau',
    options: {
      ORIGIN_OR_CONSIGNOR: {
        text: 'Tarddiad neu Draddodwr',
        hint: 'Man tarddiad, Traddodwr'
      },
      DESTINATION_CONSIGNEE_OR_IMPORTER: {
        text: 'Cyrchfan, Traddodai neu Fewnforiwr',
        hint: 'Man cyrchfan, Traddodai, Mewnforiwr'
      },
      BRANCH: { text: 'Cangen', hint: 'Cyfeiriad cangen' }
    }
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
    addressType: {
      required: 'Dewiswch fath o gyfeiriad'
    },
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
