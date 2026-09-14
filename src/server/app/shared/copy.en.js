/**
 * Shared chrome copy — the only copy that legitimately lives outside a
 * feature folder: the layout (back link, footer), the unauthorised page,
 * the error-summary title and the error page's messages. Every view reaches
 * it as `sharedCopy` via `kit.base`.
 */
export const copy = {
  layout: {
    back: 'Back',
    footer: {
      privacy: 'Privacy',
      cookies: 'Cookies',
      accessibility: 'Accessibility statement'
    }
  },
  unauthorised: {
    title: 'Unable to sign in',
    heading: 'Sorry, we are unable to sign you in.',
    bodyPrefix: 'Please',
    signInLinkText: 'try again'
  },
  errorSummary: {
    title: 'There is a problem'
  },
  errorPage: {
    notFound: 'Page not found',
    forbidden: 'Forbidden',
    unauthorized: 'Unauthorized',
    badRequest: 'Bad Request',
    unexpected: 'Something went wrong'
  }
}

/**
 * Default validator messages — the fallbacks `lib/validate` composers use
 * when a call site passes no feature message. A separate export (not a
 * `copy` key) because parameterised defaults are function leaves and
 * `copy-leaves.js`'s `isCopyLeaf` pins string-only leaves. Locale-swappable
 * the same way: a `copy.cy.js` exports its own `validatorDefaults`.
 */
export const validatorDefaults = {
  oneOf: 'Select a valid option',
  postcode: 'Enter a valid postcode',
  vehicleReg: 'Enter a valid registration number',
  ukPhone: 'Enter a valid UK telephone number',
  date: 'Enter a valid date',
  time: 'Enter a real time, like 14:30',
  wholeNumber: 'Enter a whole number',
  maxLength: (max) => `Enter ${max} characters or fewer`,
  numberBetween: (min, max) => `Enter a number between ${min} and ${max}`
}
