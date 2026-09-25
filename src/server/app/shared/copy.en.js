export const copy = {
  layout: {
    serviceName: 'Import notification service',
    errorTitlePrefix: 'Error: ',
    back: 'Back',
    phaseBanner: {
      tag: 'Alpha',
      bodyPrefix: 'This is a new service. Help us improve it and',
      feedbackLinkText: 'give your feedback by email'
    },
    serviceNavigation: {
      menuButton: 'Menu',
      dashboard: 'Dashboard',
      addressBook: 'Address book',
      manageAccount: 'Manage account',
      logOut: 'Log out'
    },
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
  recoverableError: {
    title: 'There is a problem',
    body: 'Sorry, there is a problem with the service. Try again in a few minutes.'
  },
  errorPage: {
    notFound: 'Page not found',
    forbidden: 'Forbidden',
    unauthorized: 'You need to sign in to view this page',
    badRequest: 'There is a problem with your request',
    unexpected: 'Something went wrong'
  }
}

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
