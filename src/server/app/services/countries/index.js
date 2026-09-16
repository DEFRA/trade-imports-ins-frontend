import Boom from '@hapi/boom'
import { COUNTRIES } from './stub.js'
import { fetchCountries } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let countries = [...COUNTRIES]
let loaded = false

/** Load the country list from the reference-data service, once. Every reader
 * calls this, so the list is fetched on the first read rather than on every
 * request. In stub mode the seeded COUNTRIES play the role of a loaded cache
 * and this is a no-op. A failed load leaves `loaded` false so the next reader
 * retries; a success flips the flag and later calls short-circuit. */
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
