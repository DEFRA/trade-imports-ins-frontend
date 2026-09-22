/**
 * EUDPA-390 (D8): map one lookup result onto the address book's own fields
 * (`address-book/address-schema.js` — address line 1 and 2, town or city, county,
 * postcode, country code).
 *
 * This is the spike's real question. The lookup does not return anything shaped like
 * our form, so the mapping has to be invented, and three gaps only show up once you
 * try:
 *
 * 1. Address line 1 has to be composed, and which fields carry the name varies by
 *    address. Dev returned Buckingham Palace with the whole name in `subBuildingName`
 *    and `buildingName`, `buildingNumber` and `street` all null.
 * 2. The lookup has no county at all.
 * 3. `country` is free text and upper case ("ENGLAND"), where the form wants an ISO
 *    code chosen from reference data.
 *
 * `addressLine` is the whole formatted address including the postcode, so it cannot
 * stand in for line 1.
 *
 * Nothing here is saved. The rules are a proposal for the real build to argue with.
 */

/** What the lookup cannot answer, listed so the page can show it rather than hide it. */
export const UNMAPPABLE = {
  county: 'The lookup returns no county field at all.',
  countryCode:
    'The lookup returns a country name in free text ("ENGLAND"), not an ISO code. ' +
    'Mapping it to the reference-data list is a separate decision.'
}

function joinPresent(parts, separator) {
  return parts.filter((part) => part?.trim()).join(separator)
}

/**
 * Premises first, then the street. Sub-building before building name because that is
 * the order they read in ("Unit 1, Downing House"), and a number binds to its street
 * ("1 Downing Street") rather than standing alone.
 */
export function composeAddressLines(address) {
  const premises = joinPresent(
    [address.subBuildingName, address.buildingName],
    ', '
  )
  const street = joinPresent([address.buildingNumber, address.street], ' ')
  const locality = address.locality ?? ''

  if (premises && street) {
    return {
      addressLine1: premises,
      addressLine2: joinPresent([street, locality], ', ')
    }
  }

  const only = premises || street
  if (only) {
    return { addressLine1: only, addressLine2: locality }
  }

  // Nothing to compose from. The formatted line is a poor substitute — it carries the
  // town and postcode too — but an empty line 1 would fail the form's own validation,
  // so show it and let the page flag it.
  return { addressLine1: address.addressLine ?? '', addressLine2: locality }
}

/**
 * @returns {{fields: object, gaps: string[]}} the address-book-shaped fields, and the
 *   gaps a real implementation would still have to resolve for this address.
 */
export function mapToAddressFields(address) {
  const { addressLine1, addressLine2 } = composeAddressLines(address)
  const gaps = []

  if (
    !joinPresent(
      [
        address.subBuildingName,
        address.buildingName,
        address.buildingNumber,
        address.street
      ],
      ''
    )
  ) {
    gaps.push(
      'No name, number or street — address line 1 fell back to the whole formatted address.'
    )
  }
  if (!address.town) {
    gaps.push('No town returned, and town or city is required.')
  }
  gaps.push(UNMAPPABLE.county, UNMAPPABLE.countryCode)

  return {
    fields: {
      addressLine1,
      addressLine2,
      townOrCity: address.town ?? '',
      county: '',
      postcode: address.postcode ?? '',
      countryCode: ''
    },
    gaps
  }
}
