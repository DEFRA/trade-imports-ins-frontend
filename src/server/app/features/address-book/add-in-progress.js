import { ADDRESS_TYPES } from '../../services/address-book/index.js'

const SESSION_KEY = 'addressBookAddInProgress'

const isAddressType = (value) => Object.values(ADDRESS_TYPES).includes(value)

export const storeChosenAddressType = (request, addressType) =>
  request.yar.set(SESSION_KEY, {
    ...request.yar.get(SESSION_KEY),
    addressType
  })

export const storedChosenAddressType = (request) => {
  const stored = request.yar.get(SESSION_KEY)?.addressType
  return isAddressType(stored) ? stored : undefined
}

export const storeEnteredAddress = (request, { formValues, tickedUses }) =>
  request.yar.set(SESSION_KEY, {
    ...request.yar.get(SESSION_KEY),
    formValues,
    tickedUses
  })

export const storedEnteredAddress = (request) => {
  const { formValues, tickedUses = [] } = request.yar.get(SESSION_KEY) ?? {}
  return { formValues, tickedUses }
}

export const clearAddInProgress = (request) => request.yar.clear(SESSION_KEY)
