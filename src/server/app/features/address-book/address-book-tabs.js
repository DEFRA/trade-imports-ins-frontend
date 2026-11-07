import {
  ADDRESS_TYPES,
  ROLES_BY_ADDRESS_TYPE
} from '../../services/address-book/index.js'

const roleBackedTab = (addressType) =>
  Object.freeze({
    addressType,
    roles: ROLES_BY_ADDRESS_TYPE[addressType]
  })

const transporterTab = Object.freeze({
  addressType: ADDRESS_TYPES.TRANSPORTER,
  roles: null
})

export const ADDRESS_BOOK_TABS = Object.freeze([
  roleBackedTab(ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR),
  roleBackedTab(ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER),
  transporterTab,
  roleBackedTab(ADDRESS_TYPES.BRANCH)
])

export const ROLE_BACKED_ADDRESS_BOOK_TABS = Object.freeze(
  ADDRESS_BOOK_TABS.filter((tab) => tab.roles)
)

export const [DEFAULT_ADDRESS_BOOK_TAB] = ADDRESS_BOOK_TABS

export const resolveTab = (requestedAddressType) =>
  ADDRESS_BOOK_TABS.find((tab) => tab.addressType === requestedAddressType)

export const resolveRole = (tab, requestedRole) =>
  tab.roles?.find((role) => role === requestedRole)

export const listsByRole = (tab) => Boolean(tab.roles)
