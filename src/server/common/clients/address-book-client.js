const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

import { config } from '#/config/config.js'

const addressBookBaseUrl = config.get('tradeImportsAddressBookApi.baseUrl')
const tracingHeader = config.get('tracing.header')

function buildHeaders(orgId, traceId) {
  return {
    'Content-Type': 'application/json',
    [ORGANISATION_ID_HEADER]: orgId,
    [tracingHeader]: traceId ?? ''
  }
}

function errorMessageFromBody(body, response) {
  return (
    body.detail ||
    body.message ||
    body.title ||
    response.statusText ||
    `HTTP ${response.status}`
  )
}

async function throwOnError(response) {
  if (response.ok) {
    return response
  }

  const body = await response.json().catch(() => ({}))
  const error = new Error(errorMessageFromBody(body, response))
  error.status = response.status
  error.body = body
  throw error
}

export function mapApiErrorsToFormErrors(problemBody) {
  const errors = problemBody?.errors ?? {}
  const errorList = Object.entries(errors).flatMap(([field, messages]) =>
    messages.map((text) => ({ text, href: `#${field}` }))
  )
  const fieldErrors = Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      { text: messages[0] }
    ])
  )
  return { errorList, fieldErrors }
}

export const addressBookClient = {
  async listAddresses(orgId, traceId, { page = 1, q, countryCode } = {}) {
    const url = new URL(`${addressBookBaseUrl}/organisation/${orgId}/addresses`)
    url.searchParams.set('page', String(page))
    if (q) {
      url.searchParams.set('q', q)
    }
    if (countryCode) {
      url.searchParams.set('countryCode', countryCode)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(orgId, traceId)
    })

    await throwOnError(response)
    return response.json()
  },

  async createAddress(orgId, traceId, body) {
    const url = `${addressBookBaseUrl}/organisation/${orgId}/addresses`

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(orgId, traceId),
      body: JSON.stringify(body)
    })

    if (response.status === 400) {
      const problem = await response.json()
      const error = new Error(problem.detail || 'Validation failed')
      error.status = 400
      error.body = problem
      throw error
    }

    await throwOnError(response)
    return response.json()
  },

  async getAddress(orgId, traceId, id) {
    const url = `${addressBookBaseUrl}/organisation/${orgId}/addresses/${id}`

    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(orgId, traceId)
    })

    await throwOnError(response)
    return response.json()
  },

  async updateAddress(orgId, traceId, id, body) {
    const url = `${addressBookBaseUrl}/organisation/${orgId}/addresses/${id}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: buildHeaders(orgId, traceId),
      body: JSON.stringify(body)
    })

    if (response.status === 400) {
      const problem = await response.json()
      const error = new Error(problem.detail || 'Validation failed')
      error.status = 400
      error.body = problem
      throw error
    }

    await throwOnError(response)
    return response.json()
  },

  async deleteAddress(orgId, traceId, id) {
    const url = `${addressBookBaseUrl}/organisation/${orgId}/addresses/${id}`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: buildHeaders(orgId, traceId)
    })

    await throwOnError(response)
  }
}

export { ORGANISATION_ID_HEADER, throwOnError }
