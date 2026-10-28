import { expect } from 'vitest'

export const JOURNEY_STRIP = '.app-journey-strip'

export const expectDraftJourneyStrip = ($, notificationReference) => {
  const stripTexts = (selector) =>
    $(`${JOURNEY_STRIP} ${selector}`)
      .toArray()
      .map((element) => $(element).text().trim())

  expect(stripTexts('.govuk-tag')).toEqual(['Draft'])
  expect(stripTexts('span.govuk-body')).toEqual([notificationReference])
}
