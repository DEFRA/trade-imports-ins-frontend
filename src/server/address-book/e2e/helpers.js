export const ORG_DEFAULT = 'stub-org-1'
export const ORG_EMPTY = 'stub-org-empty'
export const ORG_PAGINATED = 'stub-org-paginated'

/**
 * Signs in via the stub-auth route (see server/auth/stub-sign-in.js) - no
 * real Defra ID stub involved, only reachable when AUTH_STUB_MODE=true.
 */
export async function signIn(page, { organisationId = ORG_DEFAULT } = {}) {
  await page.goto(
    `/auth/stub-sign-in?organisationId=${encodeURIComponent(organisationId)}`
  )
}
