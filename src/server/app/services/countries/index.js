import { COUNTRIES } from './stub.js'
import { fetchCountries } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

export const getCountries = async (blocks) =>
  isStubMode() ? COUNTRIES : fetchCountries(blocks)
