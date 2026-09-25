import Boom from '@hapi/boom'
import { COUNTRIES } from './stub.js'
import { fetchCountries } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let countries = [...COUNTRIES]
let loaded = false

export const ensureLoaded = async () => {
  if (isStubMode() || loaded) {
    return
  }
  try {
    countries = await fetchCountries()
    loaded = true
  } catch (err) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: 'countries',
      cause: err
    })
  }
}

export const getCountries = async () => {
  await ensureLoaded()
  return countries
}
