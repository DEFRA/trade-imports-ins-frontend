import Boom from '@hapi/boom'
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

const addressIdRouteOptionsFailingWith = (failAction) => ({
  ...routeOptions,
  validate: { params: addressIdParams, failAction }
})

export const addressIdOrRedirectRouteOptions = (fallbackPathOf) =>
  addressIdRouteOptionsFailingWith((request, toolkit, err) => {
    const fallbackPath = fallbackPathOf(request)
    logger.info(
      { err, addressId: request.params.id, fallbackPath },
      'Address id failed validation, redirecting'
    )
    return toolkit.redirect(fallbackPath).takeover()
  })

export const addressIdRouteOptions = addressIdRouteOptionsFailingWith(
  (request, _toolkit, err) => {
    logger.info(
      { err, addressId: request.params.id },
      'Address id failed validation, not found'
    )
    throw Boom.notFound()
  }
)
