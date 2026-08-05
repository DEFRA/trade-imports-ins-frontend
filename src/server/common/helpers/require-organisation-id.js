import Boom from '@hapi/boom'

/**
 * @param {import('@hapi/hapi').Request} request
 * @returns {string}
 */
export function requireOrganisationId(request) {
  const orgId = request.auth?.credentials?.organisationId

  if (!orgId) {
    throw Boom.forbidden('Organisation could not be identified')
  }

  return orgId
}
