import { expect } from 'vitest'

import { JOURNEY_STRIP } from './journey-strip.js'

export const expectDraftJourneyStrip = ($, notificationReference) => {
  const stripTexts = (selector) =>
    $(`${JOURNEY_STRIP} ${selector}`)
      .toArray()
      .map((element) => $(element).text().trim())

  expect(stripTexts('.govuk-tag')).toEqual(['Draft'])
  expect(stripTexts('span.govuk-body')).toEqual([notificationReference])
}
