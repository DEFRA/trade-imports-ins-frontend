import {
  addressAddPath,
  addressBookPath
} from '../../src/server/app/shared/paths.js'

const HTTP_OK = 200
const HTTP_FOUND = 302

export const SEED_ADDRESS = {
  name: 'Lighthouse seed address',
  addressLine1: '1 Audit Street',
  addressLine2: 'Unit 1',
  townOrCity: 'London',
  county: 'Greater London',
  postcode: 'SW1A 1AA',
  countryCode: 'GB',
  phone: '01632 960000',
  email: 'lighthouse@example.com'
}

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

export const createSeedAddress = async (client) => {
  const form = await client.document(addressAddPath())
  if (form.status !== HTTP_OK) {
    throw new Error(`The add address page did not render (${form.status})`)
  }
  const posted = await client.submit(addressAddPath(), SEED_ADDRESS, form.crumb)
  if (posted.status !== HTTP_FOUND || posted.location !== addressBookPath()) {
    throw new Error(
      `The add address page rejected the seed address (${posted.status}) — its ` +
        'fields have moved on from what this seed sends'
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
