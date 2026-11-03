import { expect } from 'vitest'

import { JOURNEY_STRIP } from './journey-strip.js'
import { textsOf } from './rendered-text.js'

export const expectDraftJourneyStrip = ($, notificationId) => {
  expect(textsOf($, `${JOURNEY_STRIP} .govuk-tag`)).toEqual(['Draft'])
  expect(textsOf($, `${JOURNEY_STRIP} span.govuk-body`)).toEqual([
    notificationId
  ])
}
