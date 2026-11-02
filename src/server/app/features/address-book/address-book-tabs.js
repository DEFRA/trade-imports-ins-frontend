import { ADDRESS_TYPES } from '../../services/address-book/index.js'

export const ADDRESS_BOOK_TABS = Object.freeze([
  Object.freeze({
    addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
    copyKey: 'originOrConsignor'
  }),
  Object.freeze({
    addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
    copyKey: 'destinationConsigneeOrImporter'
  }),
  Object.freeze({
    addressType: ADDRESS_TYPES.BRANCH,
    copyKey: 'branch'
  })
])

export const [DEFAULT_ADDRESS_BOOK_TAB] = ADDRESS_BOOK_TABS

export const resolveTab = (requestedAddressType) =>
  ADDRESS_BOOK_TABS.find((tab) => tab.addressType === requestedAddressType) ??
  DEFAULT_ADDRESS_BOOK_TAB
