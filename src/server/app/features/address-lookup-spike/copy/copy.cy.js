// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Sbeic chwilio am gyfeiriad',
  caption:
    'EUDPA-390 — datblygu/lleol yn unig, dros dro. Nid oes dim yn cael ei gadw.',
  form: {
    label: 'Cod post neu gyfeiriad',
    hint: 'Caiff cod post yn y DU ei chwilio fel cod post. Caiff unrhyw beth arall ei chwilio fel testun rhydd.',
    button: 'Chwilio'
  },
  errors: { termRequired: 'Rhowch god post neu gyfeiriad i chwilio amdano' },
  warnings: {
    iconFallbackText: 'Rhybudd',
    network:
      'Methodd y cais i chwilio am gyfeiriad cyn i’r ôl-wasanaeth allu ateb.',
    chosen:
      'Nid oedd modd darllen y cyfeiriad a ddewiswyd. Chwiliwch eto a dewiswch ganlyniad.'
  },
  search: {
    searched: 'Wedi chwilio',
    modePostcode:
      'Roedd hynny’n edrych fel cod post yn y DU, felly cafodd ei chwilio fel un.',
    modeFind:
      'Nid oedd hynny’n edrych fel cod post yn y DU, felly cafodd ei chwilio fel testun rhydd.',
    returned: (returned, total) => `${returned} o ${total} wedi’u dychwelyd.`,
    nothingReturned: 'Ni ddychwelwyd dim.',
    failed: (reason) => `Wedi methu: ${reason}`,
    matchLine: (match, description, uprn) =>
      `Cyfatebiaeth ${match} (${description}) · UPRN ${uprn}`,
    useAddress: 'Defnyddio’r cyfeiriad hwn'
  },
  outcome: {
    results: 'Canlyniadau',
    noResults: 'Dim canlyniadau',
    failed: 'Wedi methu'
  },
  timings: {
    heading: 'Ble aeth yr amser',
    cached:
      'Cafodd y tocyn mynediad a gadwyd ei ailddefnyddio, felly ni redodd yr un o’r camau tocyn.',
    minted:
      'Nid oedd tocyn defnyddiadwy wedi’i gadw, felly talodd y chwiliad hwn am y ddau gam tocyn.',
    hop: 'Cam',
    time: 'Amser',
    milliseconds: (ms) => `${ms}ms`,
    traceIdLabel: 'ID olrhain',
    traceIdSuffix: '— am y darlun llawn yn OpenSearch.',
    hops: {
      sts: 'AWS STS, yn bathu’r haeriad',
      entra: 'Entra, yn ei gyfnewid am docyn mynediad',
      gateway: 'Y porth chwilio am gyfeiriadau',
      backend: 'Popeth a wnaeth yr ôl-wasanaeth',
      page: 'Y dudalen hon, gan gynnwys yr alwad i’r ôl-wasanaeth'
    }
  },
  mapped: {
    heading: 'Wedi’i fapio i feysydd y llyfr cyfeiriadau',
    addressLine1: 'Llinell 1 y cyfeiriad',
    addressLine2: 'Llinell 2 y cyfeiriad',
    townOrCity: 'Tref neu ddinas',
    county: 'Sir',
    postcode: 'Cod post',
    country: 'Gwlad',
    gapsIntro: 'Yr hyn na allai’r chwiliad ei lenwi:',
    raw: 'Y canlyniad crai y daeth hwn ohono'
  }
}
