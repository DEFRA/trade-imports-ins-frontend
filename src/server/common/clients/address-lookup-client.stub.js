/**
 * In-memory stand-in for the EUDPA-390 address lookup spike backend, selected by
 * `INS_MODE=stub` (see mode.js). Mirrors the exact shape of the real
 * `GET /address-lookup` response (plan, "The backend → frontend contract") so the
 * controller/view don't need to know which client is behind them.
 *
 * The three results are the same fixture trade-imports-stub's address lookup
 * simulator serves, shaped like what dev really returned on 2026-09-17 rather than
 * like the published v2.1 specification: everything upper case, `country` free text
 * rather than an ISO code, no county, and `match` a string. The first is the
 * Buckingham Palace case, where the whole name arrives in `subBuildingName` and
 * `buildingName`, `buildingNumber` and `street` are all null.
 */
const DEFAULT_POSTCODE = 'SW1A 1AA'

const RESULTS = [
  {
    addressLine: 'BUCKINGHAM PALACE, LONDON, SW1A 1AA',
    buildingNumber: null,
    buildingName: null,
    subBuildingName: 'BUCKINGHAM PALACE',
    street: null,
    locality: null,
    town: 'LONDON',
    postcode: 'SW1A 1AA',
    country: 'ENGLAND',
    uprn: '100023336901',
    match: '1',
    matchDescription: 'EXACT',
    language: 'EN'
  },
  {
    addressLine: '1 DOWNING STREET, LONDON, SW1A 1AA',
    buildingNumber: '1',
    buildingName: null,
    subBuildingName: null,
    street: 'DOWNING STREET',
    locality: null,
    town: 'LONDON',
    postcode: 'SW1A 1AA',
    country: 'ENGLAND',
    uprn: '100023336902',
    match: '1',
    matchDescription: 'EXACT',
    language: 'EN'
  },
  {
    addressLine: 'UNIT 1, DOWNING HOUSE, DOWNING STREET, LONDON, SW1A 1AA',
    buildingNumber: null,
    buildingName: 'DOWNING HOUSE',
    subBuildingName: 'UNIT 1',
    street: 'DOWNING STREET',
    locality: null,
    town: 'LONDON',
    postcode: 'SW1A 1AA',
    country: 'ENGLAND',
    uprn: '100023336903',
    match: '1',
    matchDescription: 'EXACT',
    language: 'EN'
  }
]

function response(mode, term) {
  return {
    outcome: 'RESULTS',
    query: { mode, term },
    results: RESULTS,
    totalResults: RESULTS.length,
    returnedResults: RESULTS.length,
    failureReason: null
  }
}

export const addressLookupClient = {
  async lookupDefaultPostcode(_traceId) {
    return response('POSTCODE', DEFAULT_POSTCODE)
  },

  async lookupByPostcode(postcode, _traceId) {
    return response('POSTCODE', postcode)
  },

  /**
   * The same results as a postcode search, deliberately. What find really matches is a
   * question only the real gateway can answer, and a stub that guessed would read as an
   * answer.
   */
  async lookupByFind(find, _traceId) {
    return response('FIND', find)
  }
}
