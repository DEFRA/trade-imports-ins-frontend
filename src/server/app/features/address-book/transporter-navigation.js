import { ADDRESS_TYPES } from '../../services/address-book/index.js'
import { addressTypePath } from '../../shared/paths.js'
import { copyFor } from '../../shared/copy.js'
import { addressBookPageHref } from './view-model/list.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const transporterBackHref = () => addressTypePath()

export const transporterCancelHref = () =>
  addressBookPageHref(1, { addressType: ADDRESS_TYPES.TRANSPORTER })

export const transporterCancelLabel = () =>
  copy.add.cancelAndReturnToAddressBook
