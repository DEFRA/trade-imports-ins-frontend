import { afterEach, beforeEach, vi } from 'vitest'

import { createLogger } from '../helpers/logging/logger.js'

const captureLogsAt = (level) => {
  const entries = []
  let spy

  beforeEach(() => {
    entries.length = 0
    spy = vi
      .spyOn(createLogger(), level)
      .mockImplementation((fields, message) => {
        entries.push({ fields, message })
      })
  })

  afterEach(() => {
    spy.mockRestore()
  })

  return (message) => entries.filter((entry) => entry.message === message)
}

export const captureInfoLogs = () => captureLogsAt('info')

export const captureWarnLogs = () => captureLogsAt('warn')
