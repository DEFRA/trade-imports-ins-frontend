import { afterEach, beforeEach, vi } from 'vitest'

import { createLogger } from '../helpers/logging/logger.js'

const recordedLines = (spyOnLogger) => {
  const entries = []
  const record = (fields, message) => {
    entries.push({ fields, message })
  }
  let spy

  beforeEach(() => {
    entries.length = 0
    spy = spyOnLogger(record)
  })

  afterEach(() => {
    spy.mockRestore()
  })

  return {
    entries,
    entriesWith: (message) =>
      entries.filter((entry) => entry.message === message)
  }
}

const recordModuleLoggerLevel = (level) =>
  recordedLines((record) =>
    vi.spyOn(createLogger(), level).mockImplementation(record)
  )

/**
 * Records the info lines the module-level logger writes during each test of the
 * enclosing `describe`, and restores the logger afterwards.
 *
 * @returns {{ entries: Array<{ fields: object, message: string }>, entriesWith: (message: string) => Array<{ fields: object, message: string }> }}
 */
export const recordModuleLoggerInfo = () => recordModuleLoggerLevel('info')

/**
 * Records the warn lines the module-level logger writes during each test of the
 * enclosing `describe`, and restores the logger afterwards.
 *
 * @returns {{ entries: Array<{ fields: object, message: string }>, entriesWith: (message: string) => Array<{ fields: object, message: string }> }}
 */
export const recordModuleLoggerWarn = () => recordModuleLoggerLevel('warn')

/**
 * Records the error lines the module-level logger writes during each test of the
 * enclosing `describe`, and restores the logger afterwards.
 *
 * @returns {{ entries: Array<{ fields: object, message: string }>, entriesWith: (message: string) => Array<{ fields: object, message: string }> }}
 */
export const recordModuleLoggerError = () => recordModuleLoggerLevel('error')

/**
 * Records the error lines each request's logger (`request.logger`) writes
 * during each test of the enclosing `describe`, and restores the server's
 * logger afterwards.
 *
 * @param {() => object} getServer - returns the started Hapi server
 * @returns {{ entries: Array<{ fields: object, message: string }>, entriesWith: (message: string) => Array<{ fields: object, message: string }> }}
 */
export const recordRequestLoggerError = (getServer) =>
  recordedLines((record) => {
    const serverLogger = getServer().logger
    const createRequestLogger = serverLogger.child.bind(serverLogger)
    return vi.spyOn(serverLogger, 'child').mockImplementation((...args) => {
      const requestLogger = createRequestLogger(...args)
      requestLogger.error = record
      return requestLogger
    })
  })
