import Boom from '@hapi/boom'
import { getTraceId } from '@defra/hapi-tracing'

import { addressBookClient } from '#/server/common/clients/address-book-client.js'
import { buildFullAddress } from '#/server/common/helpers/address-book-helper.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getAddressFormCountries } from '../address-countries.js'

const logger = createLogger()
const VIEW = 'address-book/view/index'

export function buildRows(address, countryName) {
  return [
    { key: { text: 'Name' }, value: { text: address.name } },
    { key: { text: 'Address' }, value: { text: buildFullAddress(address) } },
    {
      key: { text: 'Country' },
      value: { text: countryName ?? address.countryCode }
    },
    { key: { text: 'Telephone' }, value: { text: address.phone } },
    { key: { text: 'Email' }, value: { text: address.email } }
  ]
}

export const viewController = {
  async handler(request, h) {
    const traceId = getTraceId() ?? ''
    const orgId = request.auth.credentials.organisationId
    const { id } = request.params

    try {
      const address = await addressBookClient.getAddress(orgId, traceId, id)

      if (address.deleted) {
        throw Boom.notFound()
      }

      const countries = await getAddressFormCountries(traceId).catch(() => [])
      const countryNames = Object.fromEntries(
        countries.map((country) => [country.code, country.name])
      )
      const countryName =
        countryNames[address.countryCode] ?? address.countryCode

      return h.view(VIEW, {
        pageTitle: address.name,
        heading: address.name,
        id,
        summaryRows: buildRows(address, countryName)
      })
    } catch (err) {
      if (err.isBoom) {
        throw err
      }

      if (err.status === statusCodes.notFound) {
        throw Boom.notFound()
      }

      logger.error({ err, traceId, orgId, id }, 'Failed to load address')
      throw Boom.internal()
    }
  }
}
