export const SET_BASES = Object.freeze({
  LIVE_ANIMALS: '/live-animals',
  HIGH_RISK_PLANTS: '/high-risk-plants'
})

export const SET_FRONTEND_BASE_URL_KEYS = Object.freeze({
  [SET_BASES.LIVE_ANIMALS]: 'tradeImportsAnimalsFrontend.baseUrl',
  [SET_BASES.HIGH_RISK_PLANTS]: 'tradeImportsPlantsFrontend.baseUrl'
})
