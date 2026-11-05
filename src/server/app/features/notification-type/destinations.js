import { SET_BASES } from '../../../common/constants/journey-set-bases.js'
import { buildSetBaseUrl } from '../../../common/helpers/set-base-url.js'

const ANIMALS_FRONTEND = 'tradeImportsAnimalsFrontend.baseUrl'
const PLANTS_FRONTEND = 'tradeImportsPlantsFrontend.baseUrl'

/**
 * The notification types the question offers, in the order it offers them.
 */
export const NOTIFICATION_TYPES = Object.freeze([
  {
    value: 'live-animals',
    copyKey: 'liveAnimals',
    setBase: SET_BASES.LIVE_ANIMALS,
    frontend: ANIMALS_FRONTEND
  },
  {
    value: 'germinal-products',
    copyKey: 'germinalProducts',
    setBase: SET_BASES.GERMINAL_PRODUCTS,
    frontend: ANIMALS_FRONTEND
  },
  {
    value: 'plants-for-planting',
    copyKey: 'plantsForPlanting',
    setBase: SET_BASES.HIGH_RISK_PLANTS,
    frontend: PLANTS_FRONTEND
  },
  {
    value: 'potatoes',
    copyKey: 'potatoes',
    setBase: SET_BASES.HIGH_RISK_PLANTS,
    frontend: PLANTS_FRONTEND
  },
  {
    value: 'wood-products',
    copyKey: 'woodProducts',
    setBase: SET_BASES.HIGH_RISK_PLANTS,
    frontend: PLANTS_FRONTEND
  }
])

/**
 * Builds the start URL a chosen notification type hands over to.
 *
 * @param {string} value - one of the `NOTIFICATION_TYPES` values
 * @returns {string} absolute URL of the type's start entry
 */
export const startUrlFor = (value) => {
  const START_ENTRY = '/start'
  const { frontend, setBase } = NOTIFICATION_TYPES.find(
    (type) => type.value === value
  )
  return `${buildSetBaseUrl(frontend, setBase)}${START_ENTRY}`
}
