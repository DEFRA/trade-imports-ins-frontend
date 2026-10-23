import { load } from 'cheerio'
import { expect } from 'vitest'

export const expectAddressFormWidths = (result) => {
  const INPUT = 'govuk-input'
  const SELECT = 'govuk-select'
  const ONE_HALF = 'govuk-!-width-one-half'
  const TWO_THIRDS = 'govuk-!-width-two-thirds'
  const $ = load(result)
  const classesOf = (id) => $(`#${id}`).attr('class').split(' ')

  for (const id of ['name', 'addressLine1', 'addressLine2', 'email']) {
    expect(classesOf(id), id).toEqual([INPUT])
  }
  for (const id of ['townOrCity', 'county', 'postcode']) {
    expect(classesOf(id), id).toEqual([INPUT, ONE_HALF])
  }
  expect(classesOf('countryCode'), 'countryCode').toEqual([SELECT, ONE_HALF])
  expect(classesOf('phone'), 'phone').toEqual([INPUT, TWO_THIRDS])
}
