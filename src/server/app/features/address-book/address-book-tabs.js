import {
  ADDRESS_TYPES,
  ROLES_BY_ADDRESS_TYPE
} from '../../services/address-book/index.js'
import { TRANSPORTER_TYPES } from '../../services/transporters/index.js'

const roleBackedTab = (addressType) => {
  const roles = ROLES_BY_ADDRESS_TYPE[addressType]
  return Object.freeze({
    addressType,
    roles,
    typeFilter: Object.freeze({ param: 'role', values: roles })
  })
}

const transporterTab = Object.freeze({
  addressType: ADDRESS_TYPES.TRANSPORTER,
  roles: null,
  typeFilter: Object.freeze({
    param: 'type',
    values: [TRANSPORTER_TYPES.COMMERCIAL, TRANSPORTER_TYPES.PRIVATE]
  })
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

export const resolveTypeFilterValue = (tab, requestedValue) =>
  tab.typeFilter.values.find((value) => value === requestedValue)

export const listsByRole = (tab) => Boolean(tab.roles)
