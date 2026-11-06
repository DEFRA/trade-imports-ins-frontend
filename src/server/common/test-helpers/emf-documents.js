import { expect, vi } from 'vitest'

const firstArgument = ([line]) => line
const isJsonLine = (line) => typeof line === 'string' && line.startsWith('{')
const isEmfDocument = (document) => Boolean(document._aws)

/**
 * Reads the EMF documents written to a console.log spy.
 * @param {import('vitest').MockInstance} logSpy - spy on console.log
 * @returns {object[]} the parsed EMF documents, in the order they were logged
 */
export const readEmfDocuments = (logSpy) =>
  logSpy.mock.calls
    .map(firstArgument)
    .filter(isJsonLine)
    .map((line) => JSON.parse(line))
    .filter(isEmfDocument)

/**
 * Waits for the EMF document written for one external call operation.
 * @param {import('vitest').MockInstance} logSpy - spy on console.log
 * @param {string} operation - the call's operation, such as `jwks`
 * @returns {Promise<object>} the first EMF document logged for that operation, waiting until one is logged
 */
export const awaitEmfDocumentForOperation = (logSpy, operation) =>
  vi.waitFor(() => {
    const document = readEmfDocuments(logSpy).find(
      (candidate) => candidate.Operation === operation
    )
    expect(document).toBeDefined()
    return document
  })
