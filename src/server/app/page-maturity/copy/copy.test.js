import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../shared/copy-leaves.js'
import { LEVELS } from '../levels.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const MACHINE_DRAFT =
  '// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.'

describe('#page maturity copy', () => {
  it('Should hold the same leaf paths in Welsh as in English', () => {
    const paths = (bundle) => leaves(bundle).map(({ path }) => path)

    expect(paths(cy)).toEqual(paths(en))
  })

  it('Should hold non-empty Welsh text that differs from the English at every leaf', () => {
    const english = new Map(leaves(en).map(({ path, value }) => [path, value]))

    for (const { path, value } of leaves(cy)) {
      expect(isCopyLeaf(value), `cy: ${path} must be copy`).toBe(true)
      expect(value, `cy: ${path} must be translated`).not.toBe(
        english.get(path)
      )
    }
  })

  it.each([
    ['en', en],
    ['cy', cy]
  ])('Should carry one %s entry for every level', (_locale, bundle) => {
    expect(Object.keys(bundle.levels).toSorted()).toEqual(
      Object.values(LEVELS).toSorted()
    )
  })

  it('Should mark the Welsh as a machine draft on its first line', () => {
    const source = readFileSync(new URL('copy.cy.js', import.meta.url), 'utf8')

    expect(source.split('\n')[0]).toBe(MACHINE_DRAFT)
  })
})
