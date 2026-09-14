// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Dangosfwrdd',
  search: {
    label: 'Chwilio yn ôl cyfeirnod yr hysbysiad',
    button: 'Chwilio',
    clear: 'Clirio’r chwiliad',
    noResults: 'Ni chanfuwyd unrhyw hysbysiadau'
  },
  sort: {
    label: 'Trefnu yn ôl',
    update: 'Diweddaru’r drefn',
    options: {
      arrivalNewest: 'Dyddiad cyrraedd (mwyaf newydd yn gyntaf)',
      arrivalOldest: 'Dyddiad cyrraedd (hynaf yn gyntaf)',
      updatedNewest: 'Diweddarwyd ddiwethaf (mwyaf newydd yn gyntaf)',
      updatedOldest: 'Diweddarwyd ddiwethaf (hynaf yn gyntaf)'
    }
  },
  results: (from, to, total) => `Yn dangos ${from}-${to} o ${total}`,
  table: {
    caption: 'Hysbysiadau',
    reference: 'Cyfeirnod',
    status: 'Statws',
    origin: 'Gwlad tarddiad',
    commodity: 'Nwydd',
    arrival: 'Dyddiad cyrraedd',
    action: 'Cam gweithredu',
    view: 'Gweld'
  },
  empty: {
    text: 'Nid oes unrhyw hysbysiadau eto.',
    startButton: 'Dechrau hysbysiad newydd'
  },
  errors: {
    load: 'Aeth rhywbeth o’i le wrth lwytho’r dangosfwrdd'
  }
}
