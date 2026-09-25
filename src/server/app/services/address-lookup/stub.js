/**
 * In-memory stand-in for the INS backend's address lookup, selected by
 * `STUB_MODE=true` (see mode.js). Holds the same three addresses as
 * trade-imports-stub's address lookup simulator.
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

const response = (mode, term) => ({
  outcome: 'RESULTS',
  query: { mode, term },
  results: RESULTS,
  totalResults: RESULTS.length,
  returnedResults: RESULTS.length,
  failureReason: null
})

export const lookupDefaultPostcode = async () =>
  response('POSTCODE', DEFAULT_POSTCODE)
export const lookupByPostcode = async (postcode) =>
  response('POSTCODE', postcode)
export const lookupByFind = async (find) => response('FIND', find)
