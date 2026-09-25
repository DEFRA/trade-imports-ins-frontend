export const copy = {
  title: 'Address lookup spike',
  caption: 'EUDPA-390 — dev/local only, temporary. Nothing is saved.',
  form: {
    label: 'Postcode or address',
    hint: 'A UK postcode is searched as a postcode. Anything else is searched as free text.',
    button: 'Search'
  },
  errors: { termRequired: 'Enter a postcode or an address to search for' },
  warnings: {
    iconFallbackText: 'Warning',
    network:
      'The address lookup request failed before the backend could answer.',
    chosen:
      'The chosen address could not be read. Search again and pick a result.'
  },
  search: {
    searched: 'Searched',
    modePostcode: 'That looked like a UK postcode, so it was searched as one.',
    modeFind:
      'That did not look like a UK postcode, so it was searched as free text.',
    returned: (returned, total) => `${returned} of ${total} returned.`,
    nothingReturned: 'Nothing returned.',
    failed: (reason) => `Failed: ${reason}`,
    matchLine: (match, description, uprn) =>
      `Match ${match} (${description}) · UPRN ${uprn}`,
    useAddress: 'Use this address'
  },
  outcome: { results: 'Results', noResults: 'No results', failed: 'Failed' },
  timings: {
    heading: 'Where the time went',
    cached: 'The cached access token was reused, so neither token hop ran.',
    minted:
      'No usable token was cached, so this search paid for both token hops.',
    hop: 'Hop',
    time: 'Time',
    milliseconds: (ms) => `${ms}ms`,
    traceIdLabel: 'Trace ID',
    traceIdSuffix: '— for the full picture in OpenSearch.',
    hops: {
      sts: 'AWS STS, minting the assertion',
      entra: 'Entra, exchanging it for an access token',
      gateway: 'The address lookup gateway',
      backend: 'Everything the backend did',
      page: 'This page, including the call to the backend'
    }
  },
  mapped: {
    heading: "Mapped onto the address book's fields",
    addressLine1: 'Address line 1',
    addressLine2: 'Address line 2',
    townOrCity: 'Town or city',
    county: 'County',
    postcode: 'Postcode',
    country: 'Country',
    gapsIntro: 'What the lookup could not fill:',
    raw: 'The raw result this came from'
  }
}
