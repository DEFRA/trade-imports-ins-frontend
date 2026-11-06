import {
  ADDRESS_TYPES,
  ROLES
} from '../../src/server/app/services/address-book/address-types.js'
import { addressBookPageHref } from '../../src/server/app/features/address-book/view-model/list.js'
import {
  addressAddPath,
  addressBookPath,
  addressTypePath
} from '../../src/server/app/shared/paths.js'

const HTTP_OK = 200
const HTTP_FOUND = 302

export const SEED_ADDRESS_TYPE = ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR

export const SEED_ROLE = ROLES.PLACE_OF_ORIGIN

export const SEED_ADDRESS = {
  name: 'Lighthouse seed address',
  addressLine1: '1 Audit Street',
  addressLine2: 'Unit 1',
  townOrCity: 'London',
  county: 'Greater London',
  postcode: 'SW1A 1AA',
  countryCode: 'GB',
  email: 'lighthouse@example.com',
  phone: '01632 960000'
}

const outcomeOf = ({ status, location }) =>
  location ? `${status} to ${location}` : `${status}`

const seedSearchPath = () =>
  `${addressBookPath()}?q=${encodeURIComponent(SEED_ADDRESS.name)}`

export const addressIdIn = (href) => decodeURIComponent(href.split('/').at(-1))

const isSeedLink = (link) =>
  link.find('.govuk-visually-hidden').text().trim() === SEED_ADDRESS.name

const seedLinkHref = ($) =>
  $('table a')
    .toArray()
    .map((anchor) => $(anchor))
    .find(isSeedLink)
    ?.attr('href')

export const findSeedAddressId = async (client) => {
  const list = await client.document(seedSearchPath())
  if (list.status !== HTTP_OK) {
    throw new Error(`The address book did not render (${list.status})`)
  }
  const href = seedLinkHref(list.$)
  return href ? addressIdIn(href) : null
}

export const chooseAddressType = async (client) => {
  const typePage = await client.document(addressTypePath())
  if (typePage.status !== HTTP_OK) {
    throw new Error(`The address type page did not render (${typePage.status})`)
  }
  const posted = await client.submit(
    addressTypePath(),
    { addressType: SEED_ADDRESS_TYPE },
    typePage.crumb
  )
  if (posted.status !== HTTP_FOUND || posted.location !== addressAddPath()) {
    throw new Error(
      `The address type page did not move on to the add form (${outcomeOf(posted)})`
    )
  }
}

export const createSeedAddress = async (client) => {
  await chooseAddressType(client)
  const form = await client.document(addressAddPath())
  if (form.status !== HTTP_OK) {
    throw new Error(`The add address page did not render (${form.status})`)
  }
  const posted = await client.submit(
    addressAddPath(),
    { ...SEED_ADDRESS, roles: SEED_ROLE },
    form.crumb
  )
  const savedAddressLanding = addressBookPageHref(1, {
    addressType: SEED_ADDRESS_TYPE
  })
  if (posted.status !== HTTP_FOUND) {
    throw new Error(
      `The add address page rejected the seed address (${outcomeOf(posted)}) — its ` +
        'fields have moved on from what this seed sends'
    )
  }
  if (posted.location !== savedAddressLanding) {
    throw new Error(
      `The add address page saved the seed address but sent it to ${posted.location}, not ${savedAddressLanding}`
    )
  }
}

export const seedAddress = async (client) => {
  const existing = await findSeedAddressId(client)
  if (existing) {
    return existing
  }
  await createSeedAddress(client)
  const created = await findSeedAddressId(client)
  if (!created) {
    throw new Error(
      'The address book does not list the seed address it just accepted'
    )
  }
  return created
}
