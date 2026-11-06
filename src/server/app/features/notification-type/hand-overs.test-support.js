export const handOversFor = ({ animalsBaseUrl, plantsBaseUrl }) => [
  ['live-animals', `${animalsBaseUrl}/live-animals/start`],
  ['plants-for-planting', `${plantsBaseUrl}/high-risk-plants/start`],
  ['potatoes', `${plantsBaseUrl}/high-risk-plants/start`],
  ['wood-products', `${plantsBaseUrl}/high-risk-plants/start`]
]

export const expectedReturnUrl = ({ animalsBaseUrl, reference }) =>
  `${animalsBaseUrl}/live-animals/notifications/${encodeURIComponent(reference)}/origin`

export const SAMPLE_REFERENCE = 'DRAFT.IMP.2026.1'

export const LABELS_IN_ORDER = [
  'Live animals',
  'Plants for planting',
  'Potatoes (seed and ware)',
  'Wood products'
]
