import Boom from '@hapi/boom'

import {
  ADDRESS_TYPES,
  mapApiErrorsToFormErrors,
  isValidationFailure
} from '../../services/address-book/index.js'
import { createTransporter } from '../../services/transporters/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../lib/http-status.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import { clearTransporterAddInProgress } from './transporter-in-progress.js'
import { setSuccessMessage } from './success-message.js'
import { addressBookPageHref } from './view-model/list.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const logger = createLogger()
const { successBanner } = copyFor({ en, cy })

export const saveTransporter = async (
  request,
  toolkit,
  { transporter, formValues, buildView }
) => {
  const organisationId = kit.requireOrganisationId(request)
  try {
    const created = await createTransporter(organisationId, transporter)
    logger.info(
      { organisationId, transporterId: created.id },
      'A transporter is created from the address book'
    )
    clearTransporterAddInProgress(request)
    setSuccessMessage(request, successBanner.transporterAdded(created.name))
    return toolkit.redirect(
      addressBookPageHref(1, { addressType: ADDRESS_TYPES.TRANSPORTER })
    )
  } catch (err) {
    if (Boom.isBoom(err)) {
      throw err
    }
    if (isValidationFailure(err)) {
      logger.warn(
        { err, organisationId },
        'Address book refused the new transporter'
      )
      return (
        await buildView(toolkit, {
          formValues,
          errors: mapApiErrorsToFormErrors(err.body)
        })
      ).code(HTTP_STATUS_BAD_REQUEST)
    }
    logger.error({ err, organisationId }, 'Failed to create transporter')
    return (
      await buildView(toolkit, { formValues, recoverableError: true })
    ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}
