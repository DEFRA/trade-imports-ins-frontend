import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  ServiceNavigation,
  SkipLink
} from 'govuk-frontend'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Radios)
createAll(ServiceNavigation)
createAll(SkipLink)

import { initAddressBookSuccessBanner } from './address-book-success-banner.js'

initAddressBookSuccessBanner()
