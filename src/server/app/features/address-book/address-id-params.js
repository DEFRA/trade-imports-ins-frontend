import Joi from 'joi'

import { createLogger } from '../../../common/helpers/logging/logger.js'
import { routeOptions } from '../../shared/kit.js'

const logger = createLogger()

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

export const addressIdParams = Joi.object({
  id: Joi.string().pattern(OBJECT_ID_PATTERN).required().messages({
    'string.pattern.base': 'Enter a valid address id',
    'any.required': 'Enter a valid address id'
  })
})

export const redirectingAddressIdRouteOptions = (fallbackPathOf) => ({
  ...routeOptions,
  validate: {
    params: addressIdParams,
    failAction: (request, toolkit, err) => {
      const fallbackPath = fallbackPathOf(request)
      logger.info(
        { err, addressId: request.params.id, fallbackPath },
        'Address id failed validation, redirecting'
      )
      return toolkit.redirect(fallbackPath).takeover()
    }
  }
})
