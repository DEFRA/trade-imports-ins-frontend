import { describe, expect, it } from 'vitest'

import { itHoldsTextAtEveryLeaf } from '../../../shared/copy-leaves.test-support.js'
import { NOTIFICATION_TYPES } from '../destinations.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  itHoldsTextAtEveryLeaf({ en: copy, cy })

  it('Should carry a label in both locales for every notification type, and no other', () => {
    const copyKeys = NOTIFICATION_TYPES.map((type) => type.copyKey).toSorted()

    expect(Object.keys(copy.options).toSorted()).toEqual(copyKeys)
    expect(Object.keys(cy.options).toSorted()).toEqual(copyKeys)
  })
})
