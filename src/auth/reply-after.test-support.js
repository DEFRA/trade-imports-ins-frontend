import { setTimeout } from 'node:timers/promises'

/**
 * Builds a nock reply that sends nothing, headers included, until a delay has passed.
 * @param {number} delayMs - how long to hold back the whole response
 * @param {number} statusCode - the status to reply with
 * @param {object} body - the body to reply with
 * @returns {() => Promise<[number, object]>} a function to pass to nock's `reply`
 */
export const replyAfter = (delayMs, statusCode, body) => async () => {
  await setTimeout(delayMs)
  return [statusCode, body]
}
