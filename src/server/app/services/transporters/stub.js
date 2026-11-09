import {
  isLive,
  newObjectId,
  notFound,
  pageOfMatches,
  throwIfInvalid
} from '../stub-support.js'
import {
  NORTHERN_IRELAND_COUNTRY_CODE,
  TRANSPORTER_TYPES
} from './transporter-types.js'

const transportersByOrganisation = new Map()

const transportersOf = (organisationId) => {
  if (!transportersByOrganisation.has(organisationId)) {
    transportersByOrganisation.set(organisationId, [])
  }
  return transportersByOrganisation.get(organisationId)
}

const matchesSearch = (
  transporter,
  { searchTerm, countryCodes = [], searchTypes = [] }
) => {
  const term = searchTerm?.trim().toLowerCase()
  if (!term && countryCodes.length === 0 && searchTypes.length === 0) {
    return true
  }
  const textSearchFields = [
    'name',
    'addressLine1',
    'addressLine2',
    'townOrCity',
    'county',
    'postcode',
    'approvalNumber'
  ]
  const textMatches =
    Boolean(term) &&
    textSearchFields.some((field) =>
      (transporter[field] ?? '').toLowerCase().includes(term)
    )
  return (
    textMatches ||
    countryCodes.includes(transporter.countryCode) ||
    searchTypes.includes(transporter.type)
  )
}

const passesTypeFilter = (transporter, types) =>
  types.length === 0 || types.includes(transporter.type)

export const listTransporters = async (
  organisationId,
  { page = 1, pageSize, types = [], ...search } = {}
) => {
  const matches = transportersOf(organisationId)
    .filter(isLive)
    .filter((transporter) => passesTypeFilter(transporter, types))
    .filter((transporter) => matchesSearch(transporter, search))
  return pageOfMatches(matches, { page, pageSize })
}

const refusalsOf = ({ type, approvalNumber, countryCode }) => {
  if (type === TRANSPORTER_TYPES.COMMERCIAL) {
    if (!approvalNumber) {
      return { approvalNumber: ['Enter the approval number'] }
    }
    if (countryCode !== NORTHERN_IRELAND_COUNTRY_CODE) {
      return {
        countryCode: ['A commercial transporter must be in Northern Ireland']
      }
    }
    return null
  }
  if (approvalNumber) {
    return {
      approvalNumber: ['A private transporter must not have an approval number']
    }
  }
  return null
}

export const createTransporter = async (organisationId, transporter) => {
  throwIfInvalid(refusalsOf(transporter))
  const created = { id: newObjectId(), ...transporter, deleted: false }
  transportersOf(organisationId).unshift(created)
  return created
}

export const getTransporter = async (organisationId, transporterId) => {
  const transporter = transportersOf(organisationId).find(
    (storedTransporter) => storedTransporter.id === transporterId
  )
  if (!transporter) {
    throw notFound()
  }
  return transporter
}
