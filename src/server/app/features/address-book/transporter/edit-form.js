import {
  NORTHERN_IRELAND_COUNTRY_CODE,
  TRANSPORTER_TYPES
} from '../../../services/transporters/transporter-types.js'
import { copyFor } from '../../../shared/copy.js'
import { buildEditCountrySelectItems } from '../address-countries.js'
import {
  commercialTransporterFormValuesOf,
  commercialTransporterRules,
  privateTransporterFormValuesOf,
  privateTransporterRules
} from '../transporter-fields.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const bundle = copyFor({ en, cy })

const COMMERCIAL_FORM = {
  view: 'address-book/transporter/edit-commercial',
  fieldCopy: bundle.commercialTransporterForm,
  formValuesOf: commercialTransporterFormValuesOf,
  rulesFor: () => commercialTransporterRules(),
  countryItemsFor: () => [],
  countryCodeToStore: () => NORTHERN_IRELAND_COUNTRY_CODE,
  fixedCountryCode: NORTHERN_IRELAND_COUNTRY_CODE
}

const PRIVATE_FORM = {
  view: 'address-book/transporter/edit-private',
  fieldCopy: bundle.privateTransporterForm,
  formValuesOf: privateTransporterFormValuesOf,
  rulesFor: (countries) =>
    privateTransporterRules(countries.map((country) => country.code)),
  countryItemsFor: (countries, selectedCountryCode) =>
    buildEditCountrySelectItems(
      countries,
      selectedCountryCode,
      bundle.privateTransporterForm.countryPlaceholder
    ),
  countryCodeToStore: (formValues) => formValues.countryCode
}

/** How a transporter of this type is edited: the view that renders its form,
 * the copy its fields are labelled with, the values its payload carries, the
 * rules it must meet and the country its record is stored under.
 *
 * The type is the stored transporter's own, so a commercial transporter keeps
 * its fixed Northern Ireland country and its approval number without the type
 * question being asked again. */
export const editFormFor = (type) =>
  type === TRANSPORTER_TYPES.COMMERCIAL ? COMMERCIAL_FORM : PRIVATE_FORM
