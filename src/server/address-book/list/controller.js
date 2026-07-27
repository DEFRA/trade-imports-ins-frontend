import { getTraceId } from '@defra/hapi-tracing'

import { addressBookClient } from '#/server/common/clients/address-book-client.js'
import {
  buildPaginationLinks,
  mapAddressRows
} from '#/server/common/helpers/address-book-helper.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { getSessionValue } from '#/server/common/helpers/session-helpers.js'
import { sessionKeys } from '#/server/common/constants/session-keys.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

const logger = createLogger()
const VIEW = 'address-book/list/index'
const PAGE_TITLE = 'Address book'

function parsePage(queryPage) {
  const page = Number.parseInt(queryPage, 10)
  return Number.isNaN(page) || page < 1 ? 1 : page
}

export function buildTableRows(addresses) {
  return addresses.map((address) => [
    { text: address.name },
    { text: address.addressLine },
    { text: address.countryCode }
  ])
}

export const listController = {
  async handler(request, h) {
    const traceId = getTraceId() ?? ''
    const orgId = request.auth.credentials.organisationId
    const page = parsePage(request.query.page)
    const successBanner = getSessionValue(
      request,
      sessionKeys.addressBookSuccess,
      true
    )

    try {
      const response = await addressBookClient.listAddresses(orgId, traceId, {
        page
      })

      const pagination = {
        page: response.page,
        pageSize: response.pageSize,
        totalItems: response.totalItems,
        totalPages: response.totalPages
      }

      const addresses = mapAddressRows(response.items ?? [])
      const isEmpty = response.totalItems === 0

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        heading: PAGE_TITLE,
        addresses,
        tableRows: buildTableRows(addresses),
        pagination: buildPaginationLinks(pagination),
        paginationMeta: pagination,
        isEmpty,
        successBanner
      })
    } catch (err) {
      logger.error({ err, traceId, orgId }, 'Failed to load address book')
      return h
        .view(VIEW, {
          pageTitle: PAGE_TITLE,
          heading: PAGE_TITLE,
          addresses: [],
          tableRows: [],
          pagination: null,
          paginationMeta: null,
          isEmpty: false,
          successBanner,
          errorList: [
            { text: 'Something went wrong loading your address book' }
          ]
        })
        .code(statusCodes.internalServerError)
    }
  }
}
