import Boom from '@hapi/boom'
import { getTraceId } from '@defra/hapi-tracing'

import { addressBookClient } from '#/server/common/clients/address-book-client.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { requireOrganisationId } from '#/server/common/helpers/require-organisation-id.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getAddressFormCountries } from '../address-countries.js'

const logger = createLogger()
const VIEW = 'address-book/view/index'

/**
 * Builds the summary rows for the address details page — one row per Standard Address Block
 * field, labelled as on the edit form (`edit/index.njk`) so the same record reads identically
 * whether it is being viewed or edited.
 */
export function buildRows(address, countryName) {
  return [
    {
      key: { text: 'Name or organisation name' },
      value: { text: address.name }
    },
    { key: { text: 'Address line 1' }, value: { text: address.addressLine1 } },
    {
      key: { text: 'Address line 2 (optional)' },
      value: { text: address.addressLine2 }
    },
    { key: { text: 'Town or city' }, value: { text: address.townOrCity } },
    { key: { text: 'County' }, value: { text: address.county } },
    {
      key: { text: 'Postcode or Zip code' },
      value: { text: address.postcode }
    },
    {
      key: { text: 'Country' },
      value: { text: countryName ?? address.countryCode }
    },
    { key: { text: 'Email address' }, value: { text: address.email } },
    { key: { text: 'Phone number' }, value: { text: address.phone } }
  ]
}

export const viewController = {
  async handler(request, h) {
    const traceId = getTraceId() ?? ''
    const orgId = requireOrganisationId(request)
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
