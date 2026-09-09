import { describe, expect, test } from 'vitest'

import { errorMessageFromBody } from './http-client.js'

describe('#errorMessageFromBody', () => {
  test('prefers detail over message, title and statusText', () => {
    const body = {
      detail: 'Detail message',
      message: 'Message',
      title: 'Title'
    }
    const response = { statusText: 'Bad Request', status: 400 }

    expect(errorMessageFromBody(body, response)).toBe('Detail message')
  })

  test('falls back to message when detail is absent', () => {
    const body = { message: 'Message', title: 'Title' }
    const response = { statusText: 'Bad Request', status: 400 }

    expect(errorMessageFromBody(body, response)).toBe('Message')
  })

  test('falls back to title when detail and message are absent', () => {
    const body = { title: 'Title' }
    const response = { statusText: 'Bad Request', status: 400 }

    expect(errorMessageFromBody(body, response)).toBe('Title')
  })

  test('falls back to statusText when the body has no usable fields', () => {
    const body = {}
    const response = { statusText: 'Bad Request', status: 400 }

    expect(errorMessageFromBody(body, response)).toBe('Bad Request')
  })

  test('falls back to a generic HTTP status message when the body is empty and statusText is absent', () => {
    const body = {}
    const response = { statusText: '', status: 500 }

    expect(errorMessageFromBody(body, response)).toBe('HTTP 500')
  })
})
