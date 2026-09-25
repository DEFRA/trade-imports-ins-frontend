const DEFAULT_LOCALE = 'en'

export const copyFor = (locales, locale = DEFAULT_LOCALE) =>
  locales[locale] ?? locales[DEFAULT_LOCALE]
