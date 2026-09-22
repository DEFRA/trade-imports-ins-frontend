/**
 * EUDPA-390: decide whether what was typed is a postcode or free text, so the page can
 * have one search box instead of asking the user to pick a mode they have no reason to
 * care about.
 *
 * Looks like a UK postcode → search `postcode=`. Anything else → search `find=`.
 *
 * Deliberately the simple pattern rather than the full government one: this is a spike,
 * and the cost of getting it wrong is a search returning nothing, not bad data. It does
 * not accept the GIR 0AA special case, or a partial postcode such as "SW1A" on its own,
 * both of which fall through to `find` — which is arguably where a partial belongs.
 */
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

/**
 * Upper case with a single space before the final three characters, which is how the
 * lookup returns postcodes and how it expects to be asked. Lets "sw1a1aa" find
 * something rather than silently returning nothing.
 */
export function normalisePostcode(term) {
  const compact = term.replace(/\s+/g, '').toUpperCase()
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`
}

/**
 * @returns {{mode: 'POSTCODE'|'FIND', term: string}} the mode to search in, and the term
 *   to search with — normalised when it is a postcode, otherwise just trimmed.
 */
export function detectSearch(rawTerm) {
  const term = rawTerm.trim()

  if (UK_POSTCODE.test(term)) {
    return { mode: 'POSTCODE', term: normalisePostcode(term) }
  }

  return { mode: 'FIND', term }
}
