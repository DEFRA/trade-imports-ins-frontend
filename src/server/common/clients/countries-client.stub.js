const STUB_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IE', name: 'Ireland' }
]

export const countriesClient = {
  async getCountries() {
    return STUB_COUNTRIES
  }
}
