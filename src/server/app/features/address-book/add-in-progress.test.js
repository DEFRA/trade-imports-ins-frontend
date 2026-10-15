import { describe, expect, test } from 'vitest'

import {
  chooseAddressType,
  chosenAddressType,
  clearAddInProgress
} from './add-in-progress.js'

const requestWith = (stored = new Map()) => ({
  yar: {
    get: (key) => stored.get(key),
    set: (key, value) => stored.set(key, value),
    clear: (key) => stored.delete(key)
  }
})

describe('#addInProgress', () => {
  test('Should read back the address type that was chosen', () => {
    const request = requestWith()

    chooseAddressType(request, 'BRANCH')

    expect(chosenAddressType(request)).toBe('BRANCH')
  })

  test('Should read a stored value that is not an address type as null', () => {
    const request = requestWith(
      new Map([['addressBookAdd', { addressType: 'TRANSPORTER' }]])
    )

    expect(chosenAddressType(request)).toBeNull()
  })

  test('Should read null when nothing has been chosen', () => {
    expect(chosenAddressType(requestWith())).toBeNull()
  })

  test('Should forget the add in progress when cleared', () => {
    const request = requestWith()
    chooseAddressType(request, 'BRANCH')

    clearAddInProgress(request)

    expect(chosenAddressType(request)).toBeNull()
  })

  test('Should keep other fields already stored when choosing a type', () => {
    const stored = new Map([['addressBookAdd', { uses: ['x'] }]])

    chooseAddressType(requestWith(stored), 'BRANCH')

    expect(stored.get('addressBookAdd')).toEqual({
      uses: ['x'],
      addressType: 'BRANCH'
    })
  })
})
