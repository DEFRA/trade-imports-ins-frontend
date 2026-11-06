export async function signIn(page, { organisationId } = {}) {
  if (!organisationId) {
    throw new Error('signIn needs an organisationId')
  }
  await page.goto(
    `/auth/stub-sign-in?organisationId=${encodeURIComponent(organisationId)}`
  )
}

export async function signInAndOpen(page, organisationId, path) {
  await signIn(page, { organisationId })
  await page.goto(path)
}
