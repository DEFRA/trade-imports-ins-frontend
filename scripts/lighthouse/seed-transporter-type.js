import { TRANSPORTER_TYPES } from '../../src/server/app/services/transporters/transporter-types.js'
import {
  commercialTransporterPath,
  transporterTypePath
} from '../../src/server/app/shared/paths.js'

const HTTP_OK = 200
const HTTP_FOUND = 302

/** The one transporter type the audit chooses. Its form carries every field the private
 * form has, plus the approval number and the fixed country, so it is the fuller page of
 * the two. A session holds one chosen type at a time, so the other form cannot render in
 * the same run. */
export const AUDIT_TRANSPORTER_TYPE = TRANSPORTER_TYPES.COMMERCIAL

const outcomeOf = ({ status, location }) =>
  location ? `${status} to ${location}` : `${status}`

/** Chooses the audited transporter type on the transporter type question, so the form it
 * leads to renders its own page instead of sending the audit back to the question. */
export const chooseTransporterType = async (client) => {
  const typePage = await client.document(transporterTypePath())
  if (typePage.status !== HTTP_OK) {
    throw new Error(
      `The transporter type page did not render (${typePage.status})`
    )
  }
  const posted = await client.submit(
    transporterTypePath(),
    { transporterType: AUDIT_TRANSPORTER_TYPE },
    typePage.crumb
  )
  if (
    posted.status !== HTTP_FOUND ||
    posted.location !== commercialTransporterPath()
  ) {
    throw new Error(
      `The transporter type page did not move on to the commercial transporter form (${outcomeOf(posted)})`
    )
  }
}
