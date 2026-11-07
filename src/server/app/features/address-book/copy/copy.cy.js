// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
const SELECT_COUNTRY = 'Dewiswch wlad'
const ADD_A_NEW_ADDRESS = 'Ychwanegu cyfeiriad newydd'
const ADDRESS_TYPE = 'Math o gyfeiriad'
const ADD_A_NEW_TRANSPORTER = 'Ychwanegu cludydd newydd'
const ENW_NEU_SEFYDLIAD = 'Enw neu sefydliad'
const LLINELL_GYFEIRIAD_1 = 'Llinell gyfeiriad 1'
const LLINELL_GYFEIRIAD_2 = 'Llinell gyfeiriad 2 (dewisol)'
const TREF_NEU_DDINAS = 'Tref neu ddinas'
const SIR = 'Sir (dewisol)'
const COD_POST = 'Cod post neu god zip'
const CYFEIRIAD_E_BOST = 'Cyfeiriad e-bost'
const RHIF_FFON = 'Rhif ffôn'
const RHYNGWLADOL_HINT = 'Ar gyfer rhifau rhyngwladol, cynhwyswch god y wlad'
const CADW_A_PHARHAU = 'Cadw a pharhau'
const CYFEIRIAD_HEADING = 'Cyfeiriad'
const MANYLION_CYSWLLT = 'Manylion cyswllt'

export const copy = {
  list: {
    title: 'Llyfr cyfeiriadau',
    intro:
      'Rheoli eich cyfeiriadau i’w defnyddio ar draws eich holl hysbysiadau mewnforio',
    search: {
      summary: 'Hidlo cyfeiriadau',
      label: 'Chwilio',
      hint: 'Chwilio yn ôl enw, cyfeiriad neu wlad',
      button: 'Chwilio',
      clear: 'Clirio’r chwiliad',
      role: {
        label: 'Math',
        placeholder: 'Dewiswch un'
      }
    },
    add: ADD_A_NEW_ADDRESS,
    results: (from, to, total) => `Yn dangos ${from}-${to} o ${total}`,
    noResults: 'Yn dangos 0 o 0',
    tabsLabel: 'Mathau o gyfeiriad',
    tabs: {
      ORIGIN_OR_CONSIGNOR: {
        label: 'Tarddiad ac Anfonwr',
        heading: 'Cyfeiriadau tarddiad ac anfonwr'
      },
      DESTINATION_CONSIGNEE_OR_IMPORTER: {
        label: 'Cyrchfan, Derbynnydd a Mewnforiwr',
        heading: 'Cyfeiriadau cyrchfan, derbynnydd a mewnforiwr'
      },
      TRANSPORTER: {
        label: 'Cludydd',
        heading: 'Cludwyr'
      },
      BRANCH: {
        label: 'Cangen',
        heading: 'Cyfeiriadau cangen'
      }
    },
    transporterTypes: {
      PRIVATE: 'Preifat',
      COMMERCIAL: 'Masnachol'
    },
    roles: {
      PLACE_OF_ORIGIN: {
        columnLabel: 'Man tarddiad',
        optionLabel: 'Man Tarddiad'
      },
      CONSIGNOR: { columnLabel: 'Anfonwr', optionLabel: 'Anfonwr' },
      CONSIGNEE: { columnLabel: 'Derbynnydd', optionLabel: 'Derbynnydd' },
      IMPORTER: { columnLabel: 'Mewnforiwr', optionLabel: 'Mewnforiwr' },
      PLACE_OF_DESTINATION: {
        columnLabel: 'Man cyrchfan',
        optionLabel: 'Man Cyrchfan'
      },
      BRANCH_ADDRESS: {
        columnLabel: 'Cangen',
        optionLabel: 'Cyfeiriad Cangen'
      }
    },
    table: {
      name: 'Enw',
      role: 'Math',
      address: 'Cyfeiriad',
      country: 'Gwlad',
      approvalNumber: 'Rhif cymeradwyo',
      action: 'Cam gweithredu',
      view: 'Gweld'
    }
  },
  notApplicable: 'Amherthnasol',
  successBanner: {
    title: 'Llwyddiant',
    added: (name) =>
      `Cyfeiriad ${name} wedi’i ychwanegu at eich llyfr cyfeiriadau`,
    transporterAdded: (name) =>
      `${name} wedi’i ychwanegu at eich llyfr cyfeiriadau`,
    updated: (name) => `Cyfeiriad ${name} wedi’i ddiweddaru`,
    deleted: (name) => `Cyfeiriad ${name} wedi’i ddileu`,
    deletedUnnamed: 'Cyfeiriad wedi’i ddileu'
  },
  form: {
    addressHeading: CYFEIRIAD_HEADING,
    contactHeading: MANYLION_CYSWLLT,
    fields: {
      name: ENW_NEU_SEFYDLIAD,
      addressLine1: LLINELL_GYFEIRIAD_1,
      addressLine2: LLINELL_GYFEIRIAD_2,
      townOrCity: TREF_NEU_DDINAS,
      county: SIR,
      postcode: COD_POST,
      countryCode: 'Gwlad',
      email: CYFEIRIAD_E_BOST,
      phone: RHIF_FFON
    },
    phoneHint: RHYNGWLADOL_HINT,
    countryPlaceholder: SELECT_COUNTRY
  },
  addressType: {
    caption: ADD_A_NEW_ADDRESS,
    title: 'Dewiswch fath o gyfeiriad',
    options: {
      ORIGIN_OR_CONSIGNOR: {
        label: 'Tarddiad neu Anfonwr',
        hint: 'Man tarddiad, Anfonwr'
      },
      DESTINATION_CONSIGNEE_OR_IMPORTER: {
        label: 'Cyrchfan, Derbynnydd neu Fewnforiwr',
        hint: 'Man cyrchfan, Derbynnydd, Mewnforiwr'
      },
      TRANSPORTER: { label: 'Cludydd', hint: 'Preifat, Masnachol' },
      BRANCH: { label: 'Cangen', hint: 'Cyfeiriad cangen' }
    },
    continue: 'Parhau'
  },
  transporterType: {
    caption: ADD_A_NEW_TRANSPORTER,
    title: 'Dewiswch fath o gludydd',
    warning:
      'Gwiriwch y rhestr gludwyr cyn ychwanegu cludwyr newydd i osgoi dyblygu.',
    options: {
      PRIVATE: { label: 'Cludydd preifat' },
      COMMERCIAL: {
        label: 'Masnachol',
        hint: 'Gall hyn fod yn gludydd masnachol o Ogledd Iwerddon yn unig.'
      }
    },
    continue: 'Parhau'
  },
  privateTransporterForm: {
    caption: ADD_A_NEW_TRANSPORTER,
    title: 'Ychwanegu cludydd preifat',
    addressHeading: CYFEIRIAD_HEADING,
    contactHeading: MANYLION_CYSWLLT,
    fields: {
      name: ENW_NEU_SEFYDLIAD,
      addressLine1: LLINELL_GYFEIRIAD_1,
      addressLine2: LLINELL_GYFEIRIAD_2,
      townOrCity: TREF_NEU_DDINAS,
      county: SIR,
      postcode: COD_POST,
      countryCode: 'Gwlad',
      email: CYFEIRIAD_E_BOST,
      phone: RHIF_FFON
    },
    phoneHint: RHYNGWLADOL_HINT,
    countryPlaceholder: SELECT_COUNTRY,
    save: CADW_A_PHARHAU
  },
  commercialTransporterForm: {
    caption: ADD_A_NEW_TRANSPORTER,
    title: 'Ychwanegu cludydd masnachol',
    addressHeading: CYFEIRIAD_HEADING,
    contactHeading: MANYLION_CYSWLLT,
    country: 'Gogledd Iwerddon',
    fields: {
      name: ENW_NEU_SEFYDLIAD,
      approvalNumber: 'Rhif cymeradwyo',
      addressLine1: LLINELL_GYFEIRIAD_1,
      addressLine2: LLINELL_GYFEIRIAD_2,
      townOrCity: TREF_NEU_DDINAS,
      county: SIR,
      postcode: COD_POST,
      email: CYFEIRIAD_E_BOST,
      phone: RHIF_FFON
    },
    phoneHint: RHYNGWLADOL_HINT,
    save: CADW_A_PHARHAU
  },
  roles: {
    journeyLegend: 'Ar gyfer beth arall y dylid defnyddio’r cyfeiriad hwn?',
    journeyHint: (roleLabel) =>
      `Mae’r cyfeiriad hwn yn cael ei ychwanegu fel cyfeiriad ${roleLabel}. Dewiswch unrhyw rolau neu gyfeiriadau eraill y dylid defnyddio’r cyfeiriad hwn ar eu cyfer.`,
    legendByAddressType: {
      ORIGIN_OR_CONSIGNOR: 'Ar gyfer beth y gellir defnyddio’r cyfeiriad hwn?',
      DESTINATION_CONSIGNEE_OR_IMPORTER: ADDRESS_TYPE,
      BRANCH: ADDRESS_TYPE
    },
    hint: 'Dewiswch ble y gellir defnyddio’r cyfeiriad hwn',
    options: {
      PLACE_OF_ORIGIN: { label: 'Man tarddiad' },
      CONSIGNOR: { label: 'Anfonwr' },
      CONSIGNEE: { label: 'Derbynnydd' },
      IMPORTER: { label: 'Mewnforiwr' },
      PLACE_OF_DESTINATION: { label: 'Man cyrchfan' },
      BRANCH_ADDRESS: { label: 'Cyfeiriad cangen' }
    }
  },
  add: {
    title: 'Ychwanegu manylion cyfeiriad a manylion cyswllt',
    caption: ADD_A_NEW_ADDRESS,
    save: CADW_A_PHARHAU,
    saveAndSelect: 'Cadw a dewis',
    saveAndReturnToAddressPage: 'Cadw a dychwelyd i’r dudalen gyfeiriad',
    cancelAndReturnToAddressBook: 'Canslo a dychwelyd i’r llyfr cyfeiriadau',
    cancelAndReturnToAddressPage: 'Canslo a dychwelyd i’r dudalen gyfeiriad',
    cancelAndReturnToHub: 'Canslo a dychwelyd i’r hyb'
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
    confirm: 'Ie, dileu',
    cancel: 'Na, canslo'
  },
  errors: {
    addressType: {
      required: 'Dewiswch fath o gyfeiriad'
    },
    transporterType: {
      required: 'Dewiswch pa fath o gludydd ydyw'
    },
    approvalNumber: {
      required: 'Rhowch y rhif cymeradwyo',
      maxLength: (max) => `Rhaid i’r rhif cymeradwyo fod yn ${max} nod neu lai`,
      notApplicable: 'Rhaid i gludydd preifat beidio â chael rhif cymeradwyo'
    },
    countryFixed: 'Rhaid i gludydd masnachol fod yng Ngogledd Iwerddon',
    roles: {
      required: 'Dewiswch ar gyfer beth y gellir defnyddio’r cyfeiriad hwn'
    },
    name: {
      required: 'Rhowch enw neu sefydliad',
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
