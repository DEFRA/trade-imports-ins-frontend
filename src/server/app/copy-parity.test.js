import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from './shared/copy-leaves.js'
import { copyFor } from './shared/copy.js'
import { copy as sharedEn } from './shared/copy.en.js'
import { copy as sharedCy } from './shared/copy.cy.js'
import { copy as addressBookEn } from './features/address-book/copy/copy.en.js'
import { copy as addressBookCy } from './features/address-book/copy/copy.cy.js'

const FEATURES_DIR = fileURLToPath(new URL('./features', import.meta.url))

const featuresWithCopy = readdirSync(FEATURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((feature) =>
    readdirSync(path.join(FEATURES_DIR, feature)).includes('copy')
  )
  .filter((feature) =>
    readdirSync(path.join(FEATURES_DIR, feature, 'copy')).includes('copy.en.js')
  )

// String leaves that may legitimately be byte-identical across en and cy
// (proper nouns, codes, reference formats). Keyed `${module}:${path}` —
// every addition must be justified here.
const IDENTICAL_ALLOWLIST = new Set([])

const kindOf = (value) => (typeof value === 'function' ? 'function' : 'string')

const modulePairs = async () => {
  const pairs = await Promise.all(
    featuresWithCopy.map(async (feature) => {
      const { copy: en } = await import(`./features/${feature}/copy/copy.en.js`)
      const { copy: cy } = await import(`./features/${feature}/copy/copy.cy.js`)
      return { name: feature, en, cy }
    })
  )
  return [...pairs, { name: 'shared', en: sharedEn, cy: sharedCy }]
}

describe('copy parity — cy mirrors en structurally', () => {
  it('Should find the copy module pairs', () => {
    expect(featuresWithCopy.length).toBeGreaterThan(0)
  })

  it('Should give cy the same paths, leaf kinds and function arities as en', async () => {
    for (const { name, en, cy } of await modulePairs()) {
      const enLeaves = new Map(
        leaves(en).map((leaf) => [leaf.path, leaf.value])
      )
      const cyLeaves = new Map(
        leaves(cy).map((leaf) => [leaf.path, leaf.value])
      )
      expect(
        [...cyLeaves.keys()].sort(),
        `${name}: cy paths must equal en paths`
      ).toEqual([...enLeaves.keys()].sort())
      for (const [leafPath, enValue] of enLeaves) {
        const cyValue = cyLeaves.get(leafPath)
        expect(
          kindOf(cyValue),
          `${name}: ${leafPath} leaf kind must match`
        ).toBe(kindOf(enValue))
        if (typeof enValue === 'function') {
          expect(
            cyValue.length,
            `${name}: ${leafPath} function arity must match`
          ).toBe(enValue.length)
        }
      }
    }
  })

  it('Should keep every cy leaf valid copy', async () => {
    for (const { name, cy } of await modulePairs()) {
      for (const { path: leafPath, value } of leaves(cy)) {
        expect(isCopyLeaf(value), `${name}: ${leafPath} must be copy`).toBe(
          true
        )
      }
    }
  })

  it('Should translate every string leaf unless allowlisted as identical', async () => {
    for (const { name, en, cy } of await modulePairs()) {
      const cyLeaves = new Map(
        leaves(cy).map((leaf) => [leaf.path, leaf.value])
      )
      for (const { path: leafPath, value: enValue } of leaves(en)) {
        if (
          typeof enValue !== 'string' ||
          IDENTICAL_ALLOWLIST.has(`${name}:${leafPath}`)
        ) {
          continue
        }
        expect(
          cyLeaves.get(leafPath),
          `${name}: ${leafPath} must be translated (or allowlisted)`
        ).not.toBe(enValue)
      }
    }
  })
})

describe('copy parity — the locale seam resolves cy', () => {
  it('Should resolve the cy module and interpolate through it', () => {
    const copy = copyFor({ en: addressBookEn, cy: addressBookCy }, 'cy')
    expect(copy).toBe(addressBookCy)
    expect(copy.successBanner.added('Green Farm')).toBe(
      addressBookCy.successBanner.added('Green Farm')
    )
    expect(copy.successBanner.added('Green Farm')).not.toBe(
      addressBookEn.successBanner.added('Green Farm')
    )
  })

  it('Should fall back to en for an unknown locale', () => {
    expect(copyFor({ en: addressBookEn, cy: addressBookCy }, 'fr')).toBe(
      addressBookEn
    )
  })
})
