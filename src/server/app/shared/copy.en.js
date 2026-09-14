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
