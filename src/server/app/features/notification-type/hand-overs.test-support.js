export const handOversFor = ({ animalsBaseUrl, plantsBaseUrl }) => [
  ['live-animals', `${animalsBaseUrl}/live-animals/start`],
  ['germinal-products', `${animalsBaseUrl}/germinal-products/start`],
  ['plants-for-planting', `${plantsBaseUrl}/high-risk-plants/start`],
  ['potatoes', `${plantsBaseUrl}/high-risk-plants/start`],
  ['wood-products', `${plantsBaseUrl}/high-risk-plants/start`]
]

export const expectedReturnUrl = ({ animalsBaseUrl, reference }) =>
  `${animalsBaseUrl}/live-animals/notifications/${encodeURIComponent(reference)}/origin`
