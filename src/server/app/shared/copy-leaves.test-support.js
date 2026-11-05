import { expect, it } from 'vitest'

import { isCopyLeaf, leaves } from './copy-leaves.js'

export const SAMPLE_ARGUMENTS = [1, 2, 3]

export const sampleText = (value, sampleArguments) =>
  typeof value === 'function' ? value(...sampleArguments) : value

const expectEveryLeafToBeCopy = (locale, bundle) => {
  for (const { path, value } of leaves(bundle)) {
    expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
    expect(
      sampleText(value, SAMPLE_ARGUMENTS).trim().length,
      `${locale}: ${path} must render text`
    ).toBeGreaterThan(0)
  }
}

export const itHoldsCopyAtEveryLeaf = (en, cy) =>
  it.each([
    ['en', en],
    ['cy', cy]
  ])(
    'Should hold a non-empty string or copy function at every %s leaf',
    expectEveryLeafToBeCopy
  )
