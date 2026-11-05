import { expect } from '@playwright/test'

import { copy } from '../copy/copy.en.js'
import { FIELD_RULES } from '../fields.js'
import { GB_COUNTRY } from '../address-countries.js'
import { countries } from '../../../services/_capture/fixtures.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import {
  addressAddPath,
  addressBookPath,
  addressTypePath
} from '../../../shared/paths.js'
import { signIn } from '../../../../../../fit/sign-in.js'
import { JOURNEY_HANDSHAKES_BY_PARTY } from '../../../../common/test-helpers/journey-handshake.js'

export const fieldLabels = copy.form.fields

export const fieldLabelsInFormOrder = [
  fieldLabels.name,
  fieldLabels.addressLine1,
  fieldLabels.addressLine2,
  fieldLabels.townOrCity,
  fieldLabels.county,
  fieldLabels.postcode,
  fieldLabels.countryCode,
  fieldLabels.email,
  fieldLabels.phone
]

export const addressFormCountryNames = [
  ...countries.map(({ name }) => name),
  GB_COUNTRY.name
].toSorted((left, right) => left.localeCompare(right, 'en'))

export const validAddress = {
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  addressLine2: 'Unit 3',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  email: 'exports@example.com',
  phone: '+44 1463 234567'
}

export async function setFieldValue(page, field, value) {
  const control = page.getByLabel(fieldLabels[field])
  if (field === 'countryCode') {
    await control.selectOption(value)
  } else {
    await control.fill(value)
  }
}

export async function fillValidAddress(page, overrides = {}) {
  const values = { ...validAddress, ...overrides }
  for (const [field, value] of Object.entries(values)) {
    await setFieldValue(page, field, value)
  }
}

export const addressTypeRadio = (page, addressType) =>
  page.getByRole('radio', {
    name: copy.addressType.options[addressType].label,
    exact: true
  })

export const backLink = (page) =>
  page.getByRole('link', { name: 'Back', exact: true })

export const saveAndContinueButton = (page) =>
  page.getByRole('button', { name: 'Save and continue' })

export const chooseAddressType = async (
  page,
  addressType = ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR
) => {
  await addressTypeRadio(page, addressType).check()
  await page.getByRole('button', { name: copy.addressType.continue }).click()
}

export const openAddForm = async (
  page,
  addressType = ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR
) => {
  await page.goto(addressTypePath())
  await chooseAddressType(page, addressType)
  await expect(page).toHaveURL(addressAddPath())
}

export const roleCheckbox = (page, role) =>
  page.getByRole('checkbox', {
    name: copy.roles.options[role].label,
    exact: true
  })

export const tickRoles = async (page, roles) => {
  for (const role of roles) {
    await roleCheckbox(page, role).check()
  }
}

export const expectInDocumentOrder = async (page, locators) => {
  await expect
    .poll(async () => {
      const elements = await Promise.all(
        locators.map((locator) => locator.elementHandle())
      )
      return page.evaluate(
        (candidates) =>
          candidates.every(
            (element, index) =>
              index === 0 ||
              Boolean(
                candidates[index - 1].compareDocumentPosition(element) &
                element.DOCUMENT_POSITION_FOLLOWING
              )
          ),
        elements
      )
    })
    .toBe(true)
}

export const malformedEmail = 'not-an-email'

export const refuseSaveThenReopenAddForm = async (
  page,
  { addressType, role }
) => {
  await openAddForm(page, addressType)
  await fillValidAddress(page, { email: malformedEmail })
  await tickRoles(page, [role])
  await saveAndContinueButton(page).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await backLink(page).click()
  await expect(page).toHaveURL(addressTypePath())
  await chooseAddressType(page, addressType)
  await expect(page).toHaveURL(addressAddPath())
}

export const addressTypeListUrl = (addressType) =>
  `${addressBookPath()}?${new URLSearchParams({ addressType })}`

export const originOrConsignorListUrl = addressTypeListUrl(
  ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR
)

export const addValidAddressToFreshOrganisation = async (
  page,
  {
    organisationPrefix,
    overrides = {},
    addressType = ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
    roles = ['PLACE_OF_ORIGIN']
  }
) => {
  await signIn(page, {
    organisationId: `${organisationPrefix}-${crypto.randomUUID()}`
  })
  await openAddForm(page, addressType)
  await fillValidAddress(page, overrides)
  await tickRoles(page, roles)
  await saveAndContinueButton(page).click()
  await expect(page).toHaveURL(addressTypeListUrl(addressType))
}

export const validAddressViewLink = (page) =>
  page.getByRole('link', { name: `View ${validAddress.name}` })

export const errorLink = (page, message) =>
  page.getByRole('alert').getByRole('link', { name: message, exact: true })

export async function expectErrorFocusOn(
  page,
  { message, label, expectedValue, url }
) {
  await expect(page).toHaveURL(url)
  const link = errorLink(page, message)
  await expect(link).toBeVisible()
  await link.click()
  const control = page.getByLabel(label)
  await expect(control).toBeFocused()
  await expect(control).toHaveValue(expectedValue)
}

export const requiredValidations = [
  ['name', fieldLabels.name, 'Enter a name or organisation'],
  ['addressLine1', fieldLabels.addressLine1, 'Enter address line 1'],
  ['townOrCity', fieldLabels.townOrCity, 'Enter a town or city'],
  ['postcode', fieldLabels.postcode, 'Enter a postcode or Zip code'],
  ['countryCode', fieldLabels.countryCode, 'Select a country'],
  ['phone', fieldLabels.phone, 'Enter a phone number'],
  ['email', fieldLabels.email, 'Enter an email address']
]

export const maxLengthValidations = [
  [
    'name',
    fieldLabels.name,
    FIELD_RULES.name.maxLength,
    'Name must be 255 characters or fewer'
  ],
  [
    'addressLine1',
    fieldLabels.addressLine1,
    FIELD_RULES.addressLine1.maxLength,
    'Address line 1 must be 255 characters or fewer'
  ],
  [
    'addressLine2',
    fieldLabels.addressLine2,
    FIELD_RULES.addressLine2.maxLength,
    'Address line 2 must be 255 characters or fewer'
  ],
  [
    'townOrCity',
    fieldLabels.townOrCity,
    FIELD_RULES.townOrCity.maxLength,
    'Town or city must be 100 characters or fewer'
  ],
  [
    'county',
    fieldLabels.county,
    FIELD_RULES.county.maxLength,
    'County must be 100 characters or fewer'
  ],
  [
    'postcode',
    fieldLabels.postcode,
    FIELD_RULES.postcode.maxLength,
    'Postcode must be 12 characters or fewer'
  ],
  [
    'phone',
    fieldLabels.phone,
    FIELD_RULES.phone.maxLength,
    'Telephone number must be 20 characters or fewer'
  ],
  [
    'email',
    fieldLabels.email,
    FIELD_RULES.email.maxLength,
    'Email address must be 254 characters or fewer'
  ]
]

export const openAddFormFromJourney = async (
  page,
  organisationId,
  handshake = JOURNEY_HANDSHAKES_BY_PARTY.consignor
) => {
  await signIn(page, { organisationId })
  await page.goto(`${addressAddPath()}?${new URLSearchParams(handshake)}`)
}
