export const normalisedText = (text) => text.replaceAll(/\s+/g, ' ').trim()

export const textOf = ($, selectorOrElement) =>
  normalisedText($(selectorOrElement).text())

export const textsOf = ($, selector) =>
  $(selector)
    .map((_, element) => textOf($, element))
    .get()
