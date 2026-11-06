export const isEmptySeedOrganisation = (organisationId) =>
  Boolean(organisationId?.endsWith('-empty'))
