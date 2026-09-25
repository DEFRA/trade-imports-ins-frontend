export async function signIn(page, { organisationId = 'stub-org-1' } = {}) {
  await page.goto(
    `/auth/stub-sign-in?organisationId=${encodeURIComponent(organisationId)}`
  )
}
