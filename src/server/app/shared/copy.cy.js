// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  layout: {
    back: 'Yn ôl',
    footer: {
      privacy: 'Preifatrwydd',
      cookies: 'Cwcis',
      accessibility: 'Datganiad hygyrchedd'
    }
  },
  unauthorised: {
    title: 'Methu mewngofnodi',
    heading: "Mae'n ddrwg gennym, ni allwn eich mewngofnodi.",
    bodyPrefix: 'Rhowch',
    signInLinkText: 'gynnig arall arni'
  },
  errorSummary: {
    title: 'Mae problem'
  },
  errorPage: {
    notFound: 'Heb ddod o hyd i’r dudalen',
    forbidden: 'Gwaharddedig',
    unauthorized: 'Heb awdurdod',
    badRequest: 'Cais annilys',
    unexpected: 'Aeth rhywbeth o’i le'
  }
}

export const validatorDefaults = {
  oneOf: 'Dewiswch opsiwn dilys',
  postcode: 'Rhowch god post dilys',
  vehicleReg: 'Rhowch rif cofrestru dilys',
  ukPhone: 'Rhowch rif ffôn dilys yn y DU',
  date: 'Rhowch ddyddiad dilys',
  time: 'Rhowch amser go iawn, fel 14:30',
  wholeNumber: 'Rhowch rif cyfan',
  maxLength: (max) => `Rhowch ${max} nod neu lai`,
  numberBetween: (min, max) => `Rhowch rif rhwng ${min} a ${max}`
}
