export const seedAddress = {
  id: '000000000000000000000001',
  name: 'Stub Farm 1',
  addressLine1: '1 Stub Way',
  addressLine2: '',
  townOrCity: 'Stubton',
  county: '',
  postcode: 'ST1 1UB',
  countryCode: 'GB',
  email: 'stub-farm-1@example.com',
  phone: '01234567890'
}

export const seedAddressLines = [
  seedAddress.addressLine1,
  seedAddress.townOrCity,
  seedAddress.postcode
]

export const UNKNOWN_ADDRESS_ID = 'ffffffffffffffffffffffff'
export const MALFORMED_ADDRESS_ID = 'not-a-valid-id'
