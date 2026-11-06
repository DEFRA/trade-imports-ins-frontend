import { expect, it } from 'vitest'

import { isCopyLeaf, leaves } from './copy-leaves.js'

const SAMPLE_ARGUMENTS = [1, 2, 3]

export const sampleCopyText = (value) =>
  typeof value === 'function' ? value(...SAMPLE_ARGUMENTS) : value

export const itHoldsTextAtEveryLeaf = ({ en, cy }) =>
  it.each([
    ['en', en],
    ['cy', cy]
  ])(
    'Should hold a non-empty string or copy function at every %s leaf',
    (locale, bundle) => {
      for (const { path, value } of leaves(bundle)) {
        expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
        expect(
          sampleCopyText(value).trim().length,
          `${locale}: ${path} must render text`
        ).toBeGreaterThan(0)
      }
    }
  )
