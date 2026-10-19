import Boom from '@hapi/boom'
import Joi from 'joi'

import { routeOptions } from '../../shared/kit.js'

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

export const addressIdParams = Joi.object({
  id: Joi.string().pattern(OBJECT_ID_PATTERN).required().messages({
    'string.pattern.base': 'Enter a valid address id',
    'any.required': 'Enter a valid address id'
  })
})

/**
 * Route options for a page where a malformed id is a dead link: it goes to
 * `fallbackPathOf(request)` instead of a 404.
 *
 * @param {(request: object) => string} fallbackPathOf - Where a dead link returns to
 * @returns {object} Hapi route options
 */
export const deadLinkRouteOptions = (fallbackPathOf) => ({
  ...routeOptions,
  validate: {
    params: addressIdParams,
    failAction: (request, toolkit) =>
      toolkit.redirect(fallbackPathOf(request)).takeover()
  }
})

export const addressIdRouteOptions = {
  ...routeOptions,
  validate: {
    params: addressIdParams,
    failAction: () => {
      throw Boom.notFound()
    }
  }
}
