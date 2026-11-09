import { ADDRESS_TYPES } from '../../../services/address-book/address-types.js'
import { transporterPath } from '../../../shared/paths.js'
import { addressBookPageHref } from '../view-model/list.js'
import { destinationAwayFrom, honouredReturnOf } from '../return-to.js'

/** The address book filtered to the Transporter tab: where a transporter's
 * own pages come from, and where they return to. */
export const transporterTabPath = () =>
  addressBookPageHref(1, { addressType: ADDRESS_TYPES.TRANSPORTER })

export const transporterReturnDestinationOf = (transporterId, honouredReturn) =>
  destinationAwayFrom(
    transporterPath(transporterId),
    honouredReturn,
    transporterTabPath()
  )

export const transporterDeadLinkDestination = (request) =>
  transporterReturnDestinationOf(
    request.params?.id ?? '',
    honouredReturnOf(request)
  )
