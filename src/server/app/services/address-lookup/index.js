import { isStubMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

export const lookupDefaultPostcode = () =>
  isStubMode() ? stub.lookupDefaultPostcode() : client.lookupDefaultPostcode()
export const lookupByPostcode = (postcode) =>
  isStubMode()
    ? stub.lookupByPostcode(postcode)
    : client.lookupByPostcode(postcode)
export const lookupByFind = (find) =>
  isStubMode() ? stub.lookupByFind(find) : client.lookupByFind(find)
