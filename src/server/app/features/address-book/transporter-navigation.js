import { ADDRESS_TYPES } from '../../services/address-book/index.js'
import { addressTypePath, transporterTypePath } from '../../shared/paths.js'
import { copyFor } from '../../shared/copy.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import * as kit from '../../shared/kit.js'
import { TRANSPORTER_TYPES } from '../../services/transporters/index.js'
import { addressBookPageHref } from './view-model/list.js'
import { storedChosenTransporterType } from './transporter-in-progress.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })
const logger = createLogger()

export const transporterTypeBackHref = () => addressTypePath()

export const transporterFormBackHref = () => transporterTypePath()

export const transporterCancelHref = () =>
  addressBookPageHref(1, { addressType: ADDRESS_TYPES.TRANSPORTER })

const COPY_SECTION_BY_TYPE = {
  [TRANSPORTER_TYPES.PRIVATE]: 'privateTransporterForm',
  [TRANSPORTER_TYPES.COMMERCIAL]: 'commercialTransporterForm'
}

export const transporterCancelLabel = (transporterType) =>
  copy[COPY_SECTION_BY_TYPE[transporterType]].cancel

export const redirectUnlessOwnTransporterType = (
  request,
  toolkit,
  transporterType
) => {
  const storedTransporterType = storedChosenTransporterType(request)
  if (storedTransporterType === transporterType) {
    return undefined
  }
  logger.info(
    {
      organisationId: kit.requireOrganisationId(request),
      path: request.path,
      storedTransporterType
    },
    'No transporter type chosen that this form serves, sending the user to choose one'
  )
  return toolkit.redirect(transporterTypePath())
}
