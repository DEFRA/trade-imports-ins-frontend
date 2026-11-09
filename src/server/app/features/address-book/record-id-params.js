import Joi from 'joi'

import { createLogger } from '../../../common/helpers/logging/logger.js'
import { routeOptions } from '../../shared/kit.js'

const logger = createLogger()

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

export const recordIdParams = Joi.object({
  id: Joi.string().pattern(OBJECT_ID_PATTERN).required().messages({
    'string.pattern.base': 'Enter a valid record id',
    'any.required': 'Enter a valid record id'
  })
})

export const redirectingRecordIdRouteOptions = (fallbackPathOf) => ({
  ...routeOptions,
  validate: {
    params: recordIdParams,
    failAction: (request, toolkit, err) => {
      const fallbackPath = fallbackPathOf(request)
      logger.info(
        { err, recordId: request.params.id, fallbackPath },
        'Record id failed validation, redirecting'
      )
      return toolkit.redirect(fallbackPath).takeover()
    }
  }
})
