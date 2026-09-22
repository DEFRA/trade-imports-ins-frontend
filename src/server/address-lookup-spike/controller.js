import { getTraceId } from '@defra/hapi-tracing'

import { addressLookupClient } from '#/server/common/clients/address-lookup-client.js'
import { detectSearch } from './detect-search-mode.js'
import { mapToAddressFields } from './map-to-address-fields.js'

const VIEW = 'address-lookup-spike/index'
const PAGE_TITLE = 'Address lookup spike'

function buildResultRows(results) {
  return (results ?? []).map((address, index) => ({
    index,
    addressLine: address.addressLine,
    postcode: address.postcode,
    matchDescription: address.matchDescription,
    match: address.match,
    uprn: address.uprn
  }))
}

function view(h, extra) {
  return h.view(VIEW, { pageTitle: PAGE_TITLE, heading: PAGE_TITLE, ...extra })
}

/**
 * One box, one call. What was typed decides the mode: something shaped like a UK
 * postcode is searched as `postcode=`, anything else as `find=`. The backend refuses
 * both parameters at once, so this is a single call either way.
 */
async function search(rawTerm, traceId) {
  const { mode, term } = detectSearch(rawTerm)
  const startedAt = Date.now()
  const response =
    mode === 'POSTCODE'
      ? await addressLookupClient.lookupByPostcode(term, traceId)
      : await addressLookupClient.lookupByFind(term, traceId)

  // Measured here as well as in the backend, because the difference between the two is
  // the frontend-to-backend hop — the one part of the chain the backend cannot see.
  const roundTripMs = Date.now() - startedAt

  return {
    mode,
    term,
    response,
    rows: buildResultRows(response.results),
    timings: buildTimings(response.timings, roundTripMs),
    traceId
  }
}

/**
 * The hops in the order they happen, so the page reads as a sequence rather than a set of
 * numbers. Rows the backend did not report — the token hops on a warm search — are left out
 * rather than shown as zero, because not running is the interesting part.
 */
function buildTimings(backendTimings, roundTripMs) {
  if (!backendTimings) {
    return null
  }

  const { stsMs, entraMs, lookupMs, totalMs, tokenSource } = backendTimings
  const hops = []

  if (stsMs != null) {
    hops.push(['AWS STS, minting the assertion', stsMs])
  }
  if (entraMs != null) {
    hops.push(['Entra, exchanging it for an access token', entraMs])
  }
  hops.push(['The address lookup gateway', lookupMs])
  hops.push(['Everything the backend did', totalMs])
  hops.push(['This page, including the call to the backend', roundTripMs])

  return {
    tokenSource,
    rows: hops.map(([hop, ms]) => [
      { text: hop },
      { text: `${ms}ms`, format: 'numeric' }
    ])
  }
}

/**
 * EUDPA-390 iteration 2: one search box, then a chosen result mapped onto the address
 * book's own fields. Searches run only on explicit submit, never per keystroke — the
 * lookup gives every consumer in every environment 300 requests a minute between them.
 * Nothing is saved. Dev/local only — see router.js.
 */
export const addressLookupSpikeController = {
  get: {
    handler(_request, h) {
      return view(h, {})
    }
  },
  post: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const { term, chosen } = request.payload ?? {}

      // Picking a result carries the chosen address with it rather than searching again,
      // so choosing costs no further calls against that shared rate limit.
      if (chosen) {
        try {
          const address = JSON.parse(chosen)
          if (address === null || typeof address !== 'object') {
            throw new TypeError('Chosen address is not an object')
          }
          const { fields, gaps } = mapToAddressFields(address)
          return view(h, {
            term,
            chosenAddress: address,
            addressFields: fields,
            mappingGaps: gaps,
            chosenJson: JSON.stringify(address, null, 2)
          })
        } catch (err) {
          request.logger.error(
            { err, traceId },
            'Address lookup spike could not read the chosen address'
          )
          return view(h, { term, chosenError: true })
        }
      }

      if (!term?.trim()) {
        return view(h, {
          termError: 'Enter a postcode or an address to search for'
        })
      }

      try {
        return view(h, { term, search: await search(term, traceId) })
      } catch (err) {
        request.logger.error(
          { err, traceId },
          'Address lookup spike request failed'
        )
        return view(h, { term, networkError: true })
      }
    }
  }
}
