import { ADDRESS_TYPES } from '../../services/address-book/index.js'

const SESSION_KEY = 'addressBookAddInProgress'

const isAddressType = (value) => Object.values(ADDRESS_TYPES).includes(value)

export const storeChosenAddressType = (request, addressType) =>
  request.yar.set(SESSION_KEY, { addressType })

export const chosenAddressType = (request) => {
  const stored = request.yar.get(SESSION_KEY)?.addressType
  return isAddressType(stored) ? stored : undefined
}

export const clearAddInProgress = (request) => request.yar.clear(SESSION_KEY)
