import { config } from '#/config/config.js'

/**
 * Joins a journey frontend's configured base URL to a set base.
 *
 * The configured base URLs stay host-only and may carry a trailing slash, so
 * strip it before appending the set base — one join, so a second set or a
 * second journey cannot drift between call sites.
 *
 * @param {string} baseUrlConfigKey - config key holding the frontend base URL
 * @param {string} setBase - the set base, e.g. '/live-animals'
 * @returns {string} base URL plus set base, with no trailing slash
 */
export function buildSetBaseUrl(baseUrlConfigKey, setBase) {
  const baseUrl = config.get(baseUrlConfigKey).replace(/\/$/, '')
  return `${baseUrl}${setBase}`
}
