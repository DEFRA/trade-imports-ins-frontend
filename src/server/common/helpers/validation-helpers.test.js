import { describe, expect, test } from 'vitest'

import { formatValidationErrors } from './validation-helpers.js'

describe('#formatValidationErrors', () => {
  test('maps Joi details to GOV.UK errorList and fieldErrors', () => {
    const joiError = {
      details: [
        {
          message: 'Enter address line 1',
          path: ['addressLine1']
        },
        {
          message: 'Enter an email address in the correct format',
          path: ['email']
        }
      ]
    }

    const result = formatValidationErrors(joiError)

    expect(result.errorList).toEqual([
      { text: 'Enter address line 1', href: '#addressLine1' },
      {
        text: 'Enter an email address in the correct format',
        href: '#email'
      }
    ])
    expect(result.fieldErrors.addressLine1.text).toBe('Enter address line 1')
    expect(result.fieldErrors.email.text).toBe(
      'Enter an email address in the correct format'
    )
  })
})
