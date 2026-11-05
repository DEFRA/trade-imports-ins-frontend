import { withReturn } from './return-query.js'
import { signIn } from '../../../../../../fit/sign-in.js'

export const signInAndOpen = async (
  page,
  organisationId,
  path,
  { returnTo } = {}
) => {
  await signIn(page, { organisationId })
  await page.goto(withReturn(path, returnTo))
}
