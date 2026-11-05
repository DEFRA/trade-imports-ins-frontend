import {
  ADDRESS_TYPES,
  ROLES_BY_ADDRESS_TYPE
} from '../../services/address-book/index.js'

const tabFor = (addressType, copyKey) =>
  Object.freeze({
    addressType,
    copyKey,
    roles: ROLES_BY_ADDRESS_TYPE[addressType]
  })

export const ADDRESS_BOOK_TABS = Object.freeze([
  tabFor(ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR, 'originOrConsignor'),
  tabFor(
    ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
    'destinationConsigneeOrImporter'
  ),
  tabFor(ADDRESS_TYPES.BRANCH, 'branch')
])

export const [DEFAULT_ADDRESS_BOOK_TAB] = ADDRESS_BOOK_TABS

export const resolveTab = (requestedAddressType) =>
  ADDRESS_BOOK_TABS.find((tab) => tab.addressType === requestedAddressType)

export const resolveRole = (tab, requestedRole) =>
  tab.roles.find((role) => role === requestedRole)
