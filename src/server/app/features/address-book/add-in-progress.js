import { isAddressType } from './address-types.js'

const SESSION_KEY = 'addressBookAdd'

export const chooseAddressType = (request, addressType) =>
  request.yar.set(SESSION_KEY, {
    ...(request.yar.get(SESSION_KEY) ?? {}),
    addressType
  })

export const chosenAddressType = (request) => {
  const addressType = request.yar.get(SESSION_KEY)?.addressType
  return isAddressType(addressType) ? addressType : null
}

export const clearAddInProgress = (request) => request.yar.clear(SESSION_KEY)
