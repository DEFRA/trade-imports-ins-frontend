import {
  SET_BASES,
  SET_FRONTEND_BASE_URL_KEYS
} from '../../../common/constants/journey-set-bases.js'
import {
  buildNotificationUrl,
  buildSetBaseUrl
} from '../../../common/helpers/set-base-url.js'

/**
 * The notification types the question offers, in the order it offers them.
 */
export const NOTIFICATION_TYPES = Object.freeze([
  {
    value: 'live-animals',
    copyKey: 'liveAnimals',
    setBase: SET_BASES.LIVE_ANIMALS,
    returnPage: 'origin'
  },
  {
    value: 'plants-for-planting',
    copyKey: 'plantsForPlanting',
    setBase: SET_BASES.HIGH_RISK_PLANTS
  },
  {
    value: 'potatoes',
    copyKey: 'potatoes',
    setBase: SET_BASES.HIGH_RISK_PLANTS
  },
  {
    value: 'wood-products',
    copyKey: 'woodProducts',
    setBase: SET_BASES.HIGH_RISK_PLANTS
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
  const { setBase } = NOTIFICATION_TYPES.find((type) => type.value === value)
  return `${buildSetBaseUrl(SET_FRONTEND_BASE_URL_KEYS[setBase], setBase)}${START_ENTRY}`
}

/**
 * Whether a notification of this type can be taken back to its own journey.
 *
 * @param {string} value - a notification type value
 * @returns {boolean} true when the type has a page a returning notification lands on
 */
export const takesNotificationBack = (value) =>
  NOTIFICATION_TYPES.some(
    (type) => type.value === value && type.returnPage !== undefined
  )

/**
 * Builds the URL that returns a notification to its journey frontend.
 *
 * @param {string} value - a `NOTIFICATION_TYPES` value for which `takesNotificationBack` is true
 * @param {string} reference - the notification's reference number
 * @returns {string} absolute URL of the page a returning notification lands on
 */
export const returnUrlFor = (value, reference) => {
  const { setBase, returnPage } = NOTIFICATION_TYPES.find(
    (type) => type.value === value
  )
  return `${buildNotificationUrl(SET_FRONTEND_BASE_URL_KEYS[setBase], setBase, reference)}/${returnPage}`
}
