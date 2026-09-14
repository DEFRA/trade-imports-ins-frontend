import Boom from '@hapi/boom'
import { getTraceId } from '@defra/hapi-tracing'

import {
  deleteAddress,
  getAddress
} from '../../app/services/address-book/index.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import { setSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { requireOrganisationId } from '../../app/shared/kit.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const logger = createLogger()
const VIEW = 'address-book/delete/index'
const PAGE_TITLE = 'Delete address'

export const deleteController = {
  get: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const orgId = requireOrganisationId(request)
      const { id } = request.params

      try {
        const address = await getAddress(orgId, id)

        if (address.deleted) {
          throw Boom.notFound()
        }

        return h.view(VIEW, {
          pageTitle: PAGE_TITLE,
          heading: PAGE_TITLE,
          id,
          addressName: address.name
        })
      } catch (err) {
        if (err.isBoom) {
          throw err
        }

        if (err.status === statusCodes.notFound) {
          throw Boom.notFound()
        }

        logger.error(
          { err, traceId, orgId, id },
          'Failed to load address for delete'
        )
        throw Boom.internal()
      }
    }
  },
  post: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const orgId = requireOrganisationId(request)
      const { id } = request.params

      if (request.payload?.cancel) {
        return h.redirect(`/address-book/${id}`)
      }

      try {
        const address = await getAddress(orgId, id)

        if (address.deleted) {
          throw Boom.notFound()
        }

        await deleteAddress(orgId, id)

        setSessionValue(
          request,
          sessionKeys.addressBookSuccess,
          `${address.name} deleted from your address book`
        )

        return h.redirect('/address-book')
      } catch (err) {
        if (err.isBoom) {
          throw err
        }

        if (err.status === statusCodes.notFound) {
          throw Boom.notFound()
        }

        logger.error({ err, traceId, orgId, id }, 'Failed to delete address')
        throw Boom.internal()
      }
    }
  }
}
