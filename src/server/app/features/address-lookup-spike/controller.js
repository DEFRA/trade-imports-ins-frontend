import { getTraceId } from '@defra/hapi-tracing'

import {
  lookupByFind,
  lookupByPostcode
} from '../../services/address-lookup/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import { detectSearch } from './detect-search-mode.js'
import { mapToAddressFields } from './map-to-address-fields.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const logger = createLogger()
const view = 'address-lookup-spike/template'
const copy = copyFor({ en, cy })
const PAGE_PATH = '/address-lookup-spike'
const POSTCODE_MODE = 'POSTCODE'
const CHOSEN_JSON_INDENT = 2

const buildView = (h, { recoverableError = false, ...extra } = {}) =>
  h.view(view, {
    ...kit.base(copy.title, { recoverableError }),
    contentColumnClass: kit.surfaceClass('display'),
    heading: copy.title,
    copy,
    ...extra
  })

const buildResultRows = (results) =>
  (results ?? []).map((address, index) => ({
    index,
    addressLine: address.addressLine,
    postcode: address.postcode,
    matchDescription: address.matchDescription,
    match: address.match,
    uprn: address.uprn
  }))

const buildTimings = (backendTimings, roundTripMs) => {
  if (!backendTimings) {
    return null
  }

  const { stsMs, entraMs, lookupMs, totalMs, tokenSource } = backendTimings
  const hops = []

  if (stsMs != null) {
    hops.push([copy.timings.hops.sts, stsMs])
  }
  if (entraMs != null) {
    hops.push([copy.timings.hops.entra, entraMs])
  }
  hops.push(
    [copy.timings.hops.gateway, lookupMs],
    [copy.timings.hops.backend, totalMs],
    [copy.timings.hops.page, roundTripMs]
  )

  return {
    tokenSource,
    rows: hops.map(([hop, ms]) => [
      { text: hop },
      { text: copy.timings.milliseconds(ms), format: 'numeric' }
    ])
  }
}

const search = async (rawTerm, traceId) => {
  const { mode, term } = detectSearch(rawTerm)
  const startedAt = Date.now()
  const response =
    mode === POSTCODE_MODE
      ? await lookupByPostcode(term)
      : await lookupByFind(term)

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

const get = (_request, h) => buildView(h)

const post = async (request, h) => {
  const traceId = getTraceId() ?? ''
  const { term, chosen } = request.payload ?? {}

  if (chosen) {
    try {
      const address = JSON.parse(chosen)
      if (address === null || typeof address !== 'object') {
        throw new TypeError('Chosen address is not an object')
      }
      const { fields, gaps } = mapToAddressFields(address)
      return buildView(h, {
        term,
        chosenAddress: address,
        addressFields: fields,
        mappingGaps: gaps,
        chosenJson: JSON.stringify(address, null, CHOSEN_JSON_INDENT)
      })
    } catch (err) {
      logger.error(
        { err, traceId },
        'Address lookup spike could not read the chosen address'
      )
      return buildView(h, { term, chosenError: true })
    }
  }

  if (!term?.trim()) {
    return buildView(h, { termError: copy.errors.termRequired })
  }

  try {
    return buildView(h, { term, search: await search(term, traceId) })
  } catch (err) {
    logger.error({ err, traceId }, 'Address lookup spike request failed')
    return buildView(h, { term, networkError: true })
  }
}

export const routes = kit.pageRoutes(PAGE_PATH, { get, post })
