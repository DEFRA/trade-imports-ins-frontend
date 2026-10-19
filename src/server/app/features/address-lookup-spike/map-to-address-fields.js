const UNMAPPABLE_FIELD_GAPS = {
  county: 'The lookup returns no county field at all.',
  countryCode:
    'The lookup returns a country name in free text ("ENGLAND"), not an ISO code. ' +
    'Mapping it to the reference-data list is a separate decision.'
}

function joinPresent(parts, separator) {
  return parts.filter((part) => part?.trim()).join(separator)
}

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

  const premisesOrStreet = premises || street
  if (premisesOrStreet) {
    return { addressLine1: premisesOrStreet, addressLine2: locality }
  }

  return { addressLine1: address.addressLine ?? '', addressLine2: locality }
}

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
  gaps.push(UNMAPPABLE_FIELD_GAPS.county, UNMAPPABLE_FIELD_GAPS.countryCode)

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
