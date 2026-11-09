import { displayTextOf } from '../fields.js'
import { TRANSPORTER_TYPES } from '../../../services/transporters/transporter-types.js'

/** Every field a transporter's own page lists, in the order it lists them. */
export const TRANSPORTER_SUMMARY_FIELDS = [
  'name',
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postcode',
  'countryCode',
  'approvalNumber',
  'type',
  'email',
  'phone'
]

const SHOWN_ONLY_WHEN_HELD = new Set(['addressLine2', 'county'])

/** Whether a transporter's page lists `field` at all.
 *
 * A transporter holds an approval number only when it is commercial, so a
 * private one is not asked for one and shows no row for it. Address line 2
 * and county are the two optional fields, shown only when the transporter
 * holds a value. Every other field is always shown, the type included: it is
 * intrinsic to the record rather than something the trader can leave out. */
export const transporterShowsField = (transporter, field) => {
  if (field === 'approvalNumber') {
    return transporter.type === TRANSPORTER_TYPES.COMMERCIAL
  }
  if (SHOWN_ONLY_WHEN_HELD.has(field)) {
    return Boolean(displayTextOf(transporter[field]))
  }
  return true
}

const fieldTextOf = (transporter, { countryLabel, typeLabel }, field) => {
  if (field === 'type') {
    return typeLabel
  }
  if (field === 'countryCode') {
    return countryLabel
  }
  return displayTextOf(transporter[field])
}

/** A transporter's record as summary-list rows, each field against its label. */
export const transporterSummaryRows = (
  transporter,
  { countryLabel, typeLabel, labelFor }
) =>
  TRANSPORTER_SUMMARY_FIELDS.filter((field) =>
    transporterShowsField(transporter, field)
  ).map((field) => ({
    key: { text: labelFor(field) },
    value: {
      text: fieldTextOf(transporter, { countryLabel, typeLabel }, field)
    }
  }))
