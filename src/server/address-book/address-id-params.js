import Boom from '@hapi/boom'
import Joi from 'joi'

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

export const addressIdParams = Joi.object({
  id: Joi.string().pattern(OBJECT_ID_PATTERN).required().messages({
    'string.pattern.base': 'Enter a valid address id',
    'any.required': 'Enter a valid address id'
  })
})

export const addressIdRouteOptions = {
  auth: 'session',
  validate: {
    params: addressIdParams,
    failAction: () => {
      throw Boom.notFound()
    }
  }
}
