export const ADDRESS_TYPES = Object.freeze({
  ORIGIN_OR_CONSIGNOR: 'ORIGIN_OR_CONSIGNOR',
  DESTINATION_CONSIGNEE_OR_IMPORTER: 'DESTINATION_CONSIGNEE_OR_IMPORTER',
  TRANSPORTER: 'TRANSPORTER'
})

export const ADDRESS_FORM_TYPES = Object.freeze([
  ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
  ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
])

export const ROLES = Object.freeze({
  PLACE_OF_ORIGIN: 'PLACE_OF_ORIGIN',
  CONSIGNOR: 'CONSIGNOR',
  CONSIGNEE: 'CONSIGNEE',
  IMPORTER: 'IMPORTER',
  PLACE_OF_DESTINATION: 'PLACE_OF_DESTINATION'
})

export const ROLES_BY_ADDRESS_TYPE = Object.freeze({
  [ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR]: Object.freeze([
    ROLES.PLACE_OF_ORIGIN,
    ROLES.CONSIGNOR
  ]),
  [ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER]: Object.freeze([
    ROLES.CONSIGNEE,
    ROLES.IMPORTER,
    ROLES.PLACE_OF_DESTINATION
  ])
})

export const keepRolesOfferedBy = (addressType, candidateRoles) =>
  ROLES_BY_ADDRESS_TYPE[addressType].filter((role) =>
    candidateRoles.includes(role)
  )

export const addressTypeOfRole = (role) =>
  ADDRESS_FORM_TYPES.find((addressType) =>
    ROLES_BY_ADDRESS_TYPE[addressType].includes(role)
  )

export const PLACE_ROLES = Object.freeze([
  ROLES.PLACE_OF_ORIGIN,
  ROLES.PLACE_OF_DESTINATION
])
