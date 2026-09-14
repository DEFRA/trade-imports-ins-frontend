import { deleteAddress } from '../../../services/address-book/index.js'
import * as kit from '../../../shared/kit.js'
import {
  addressBookPath,
  addressDeleteRoutePath,
  addressPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { addressIdRouteOptions } from '../address-id-params.js'
import { boomFor, loadStoredAddress } from '../stored-address.js'
import { setSuccessBanner } from '../success-banner.js'

const logger = createLogger()
const view = 'address-book/delete/template'
const PAGE_TITLE = 'Delete address'

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params

  try {
    const address = await loadStoredAddress(orgId, id)
    return h.view(view, {
      ...kit.base(PAGE_TITLE, { backLink: addressPath(id) }),
      heading: PAGE_TITLE,
      addressName: address.name
    })
  } catch (err) {
    throw boomFor(err, () =>
      logger.error({ err, orgId, id }, 'Failed to load address for delete')
    )
  }
}

const post = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const { id } = request.params
  if (request.payload?.cancel) {
    return h.redirect(addressPath(id))
  }

  try {
    const address = await loadStoredAddress(orgId, id)
    await deleteAddress(orgId, id)
    setSuccessBanner(request, `${address.name} deleted from your address book`)
    return h.redirect(addressBookPath())
  } catch (err) {
    throw boomFor(err, () =>
      logger.error({ err, orgId, id }, 'Failed to delete address')
    )
  }
}

export const routes = kit.pageRoutes(
  addressDeleteRoutePath(),
  { get, post },
  addressIdRouteOptions
)
