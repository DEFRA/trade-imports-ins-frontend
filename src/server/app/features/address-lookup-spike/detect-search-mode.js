const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

const INWARD_CODE_LENGTH = 3

export function normalisePostcode(term) {
  const compact = term.replace(/\s+/g, '').toUpperCase()
  const split = compact.length - INWARD_CODE_LENGTH
  return `${compact.slice(0, split)} ${compact.slice(split)}`
}

export function detectSearch(rawTerm) {
  const term = rawTerm.trim()

  if (UK_POSTCODE.test(term)) {
    return { mode: 'POSTCODE', term: normalisePostcode(term) }
  }

  return { mode: 'FIND', term }
}
