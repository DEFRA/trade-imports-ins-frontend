import { LEVELS } from './levels.js'

export const PAGE_LEVELS = Object.freeze({
  '/': LEVELS.exploring,
  '/address-book': LEVELS.detailing,
  '/address-book/add': LEVELS.agreed,
  '/address-book/{id}': LEVELS.readyForLive
})

export const SECTION_LEVELS = Object.freeze([])
