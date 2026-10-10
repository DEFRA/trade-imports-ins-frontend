import { SET_BASES } from '../../../common/constants/journey-set-bases.js'
import { buildSetBaseUrl } from '../../../common/helpers/set-base-url.js'

const ANIMALS_FRONTEND = 'tradeImportsAnimalsFrontend.baseUrl'
const PLANTS_FRONTEND = 'tradeImportsPlantsFrontend.baseUrl'
const START_ENTRY = '/start'

/**
 * The notification types the user can choose between, in the order the
 * question offers them. Each journey frontend serves `GET <set>/start`, which
 * creates the draft and lands on the journey's first page.
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
 * Builds the start entry a chosen notification type hands over to.
 *
 * @param {string} value - one of the `NOTIFICATION_TYPES` values
 * @returns {string} absolute URL of the journey frontend's start entry
 */
export const startUrlFor = (value) => {
  const entry = NOTIFICATION_TYPES.find((type) => type.value === value)
  return `${buildSetBaseUrl(entry.frontend, entry.setBase)}${START_ENTRY}`
}
