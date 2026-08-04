import Wreck from '@hapi/wreck'
import { getTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'

const DEFAULT_SCOPE = 'user'
const RPS_PERSON_PATH = '/person/3337243/summary'

function buildAuthHeaders(crn, token) {
  return {
    crn,
    Authorization: token,
    [config.get('tracing.header')]: getTraceId() ?? ''
  }
}

async function getPermissions(crn, organisationId, token) {
  if (config.get('permissions.useMock')) {
    return getMockPermissions(crn, organisationId)
  }

  const rpsBaseUrl = config.get('permissions.rpsBaseUrl')
  const sitiAgriBaseUrl = config.get('permissions.sitiAgriBaseUrl')

  if (!rpsBaseUrl || !sitiAgriBaseUrl) {
    throw new Error('Permissions API URLs are not configured')
  }

  const personId = await fetchPersonId(rpsBaseUrl, crn, token)
  return fetchRolesAndPrivileges(
    sitiAgriBaseUrl,
    personId,
    organisationId,
    crn,
    token
  )
}

async function fetchPersonId(rpsBaseUrl, crn, token) {
  const url = `${rpsBaseUrl.replace(/\/$/, '')}${RPS_PERSON_PATH}`

  const { payload } = await Wreck.get(url, {
    headers: buildAuthHeaders(crn, token),
    json: true
  })

  const personId = payload?._data?.id ?? payload?.id

  if (!personId) {
    throw new Error('RPS API did not return a person id')
  }

  return personId
}

async function fetchRolesAndPrivileges(
  sitiAgriBaseUrl,
  personId,
  organisationId,
  crn,
  token
) {
  const url = `${sitiAgriBaseUrl.replace(/\/$/, '')}/SitiAgriApi/authorisation/organisation/${encodeURIComponent(organisationId)}/authorisation`

  const { payload } = await Wreck.get(url, {
    headers: buildAuthHeaders(crn, token),
    json: true
  })

  const personRoles = payload?.data?.personRoles ?? []
  const personPrivileges = payload?.data?.personPrivileges ?? []

  const roleEntry = personRoles.find((entry) => entry.personId === personId)
  const privileges = personPrivileges
    .filter((entry) => entry.personId === personId)
    .flatMap((entry) => entry.privilegeNames ?? [])

  if (!roleEntry?.role) {
    throw new Error('Siti Agri API did not return a role for this user')
  }

  return {
    role: roleEntry.role,
    scope: [DEFAULT_SCOPE, ...privileges]
  }
}

async function getMockPermissions(crn, organisationId) {
  const personId = await getMockPersonId(crn)
  return getMockRolesAndPrivileges(personId, organisationId)
}

async function getMockPersonId(crn) {
  const mockResponse = {
    _data: {
      id: `mock-person-${crn}`,
      customerReferenceNumber: crn
    }
  }

  return mockResponse._data.id
}

async function getMockRolesAndPrivileges(personId, organisationId) {
  const mockResponse = {
    data: {
      personRoles: [
        {
          personId,
          role: 'Importer',
          organisationId
        }
      ],
      personPrivileges: [
        {
          personId,
          privilegeNames: ['Full permission - business']
        }
      ]
    }
  }

  const roleEntry = mockResponse.data.personRoles.find(
    (entry) => entry.personId === personId
  )
  const privileges = mockResponse.data.personPrivileges
    .filter((entry) => entry.personId === personId)
    .flatMap((entry) => entry.privilegeNames ?? [])

  return {
    role: roleEntry.role,
    scope: [DEFAULT_SCOPE, ...privileges]
  }
}

export { getPermissions }
