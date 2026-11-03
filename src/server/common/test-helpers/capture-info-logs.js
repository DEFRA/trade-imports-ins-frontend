import { afterEach, beforeEach, vi } from 'vitest'

import { createLogger } from '../helpers/logging/logger.js'

export const captureInfoLogs = () => {
  const entries = []
  let infoSpy

  beforeEach(() => {
    entries.length = 0
    infoSpy = vi
      .spyOn(createLogger(), 'info')
      .mockImplementation((fields, message) => {
        entries.push({ fields, message })
      })
  })

  afterEach(() => {
    infoSpy.mockRestore()
  })

  return (message) => entries.filter((entry) => entry.message === message)
}
