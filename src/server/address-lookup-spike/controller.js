import { getTraceId } from '@defra/hapi-tracing'

import { addressLookupClient } from '#/server/common/clients/address-lookup-client.js'

const VIEW = 'address-lookup-spike/index'
const PAGE_TITLE = 'Address lookup spike'

function buildResultRows(results) {
  return (results ?? []).map((address) => [
    { text: address.addressLine },
    { text: address.postcode },
    { text: address.matchDescription },
    { text: address.uprn }
  ])
}

/**
 * EUDPA-390 iteration 1: a heading, one button, and — once submitted — the outcome from
 * `GET /address-lookup` on trade-imports-ins-backend. No fields, no result picking; that is
 * iteration 2. Dev/local only — see router.js.
 */
export const addressLookupSpikeController = {
  get: {
    handler(_request, h) {
      return h.view(VIEW, { pageTitle: PAGE_TITLE, heading: PAGE_TITLE })
    }
  },
  post: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''

      try {
        const response =
          await addressLookupClient.lookupDefaultPostcode(traceId)
        return h.view(VIEW, {
          pageTitle: PAGE_TITLE,
          heading: PAGE_TITLE,
          response,
          resultRows: buildResultRows(response.results),
          responseJson: JSON.stringify(response, null, 2)
        })
      } catch (err) {
        request.logger.error(
          { err, traceId },
          'Address lookup spike request failed'
        )
        return h.view(VIEW, {
          pageTitle: PAGE_TITLE,
          heading: PAGE_TITLE,
          networkError: true
        })
      }
    }
  }
}
