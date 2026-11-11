import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import { requiredOneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { notificationTypePage } from './page.js'
import { copyFor } from '../../shared/copy.js'
import { dashboardPath, notificationTypePath } from '../../shared/paths.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import { trimmedField } from '../../../common/helpers/trimmed-field.js'
import {
  NOTIFICATION_TYPES,
  returnUrlFor,
  startUrlFor,
  takesNotificationBack
} from './destinations.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const logger = createLogger()
const view = 'notification-type/template'
const copy = copyFor({ en, cy })
const FIELD = 'notificationType'

const rules = requiredOneOf(
  FIELD,
  NOTIFICATION_TYPES.map(({ value }) => value),
  copy.errors.notificationType
)

const readReturningNotification = (
  request,
  source,
  { unrecognisedMessage }
) => {
  const reference = trimmedField(source, 'notification-id')
  const type = trimmedField(source, 'current-notification-type')
  if (!reference) {
    return undefined
  }
  if (!takesNotificationBack(type)) {
    logger.warn(
      {
        organisationId: kit.requireOrganisationId(request),
        notificationReference: reference,
        currentNotificationType: type
      },
      unrecognisedMessage
    )
    return undefined
  }
  return { reference, type }
}

const itemsOf = (selected) =>
  NOTIFICATION_TYPES.map(({ value, copyKey }) => ({
    value,
    text: copy.options[copyKey],
    checked: value === selected
  }))

const buildView = (h, { selected, returningNotification, errors = {} } = {}) =>
  h
    .view(view, {
      ...kit.base(copy.title, { backLink: dashboardPath() }),
      copy,
      errors,
      errorSummary: kit.errorSummary(errors),
      returningNotification,
      items: itemsOf(selected)
    })
    .header('Cache-Control', 'no-store')

const get = (request, h) => {
  const returningNotification = readReturningNotification(
    request,
    request.query,
    {
      unrecognisedMessage:
        'Returning notification not recognised, type question opened with nothing chosen'
    }
  )
  return buildView(h, {
    selected: returningNotification?.type,
    returningNotification
  })
}

const logDestination = (request, fields, message) =>
  logger.info(
    {
      organisationId: kit.requireOrganisationId(request),
      crn: request.auth.credentials.crn,
      ...fields
    },
    message
  )

const returnToNotification = (request, h, returningNotification) => {
  const destination = returnUrlFor(
    returningNotification.type,
    returningNotification.reference
  )
  logDestination(
    request,
    {
      notificationReference: returningNotification.reference,
      notificationType: returningNotification.type,
      destination
    },
    'Notification type kept, returning to the notification'
  )
  return h.redirect(destination)
}

const handOverToJourney = (
  request,
  h,
  notificationType,
  returningNotification
) => {
  const destination = startUrlFor(notificationType)
  logDestination(
    request,
    {
      notificationType,
      destination,
      ...(returningNotification && {
        leftNotificationReference: returningNotification.reference,
        leftNotificationType: returningNotification.type
      })
    },
    'Notification type chosen, handing over to the journey frontend'
  )
  return h.redirect(destination)
}

const post = (request, h) => {
  const selected = request.payload?.[FIELD]
  const returningNotification = readReturningNotification(
    request,
    request.payload,
    {
      unrecognisedMessage:
        'Returning notification not recognised, handled as a new notification'
    }
  )
  const { errors, value } = validate(rules, { [FIELD]: selected })
  if (errors) {
    return buildView(h, { selected, returningNotification, errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  return value[FIELD] === returningNotification?.type
    ? returnToNotification(request, h, returningNotification)
    : handOverToJourney(request, h, value[FIELD], returningNotification)
}

export const routes = kit.pageRoutes(
  notificationTypePage,
  notificationTypePath(),
  { get, post }
)
