import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import { requiredOneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import {
  dashboardPath,
  notificationTypePath,
  templateNotificationTypePath
} from '../../shared/paths.js'
import {
  manageTemplatesUrl,
  NOTIFICATION_TYPES,
  startUrlFor,
  TEMPLATE_TYPES,
  templateNameUrlFor
} from './destinations.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const view = 'notification-type/template'
const copy = copyFor({ en, cy })
const FIELD = 'notificationType'
const TEMPLATE_FIELD = 'templateId'

// A template id comes back from the user's browser, so it is only passed on
// when it has the shape of one the animals service issues.
const TEMPLATE_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/

const templateIdOf = (value) =>
  typeof value === 'string' && TEMPLATE_ID_PATTERN.test(value)
    ? value
    : undefined

const valuesOf = (types) => types.map(({ value }) => value)

const modeFor = ({
  types,
  backLink,
  destination,
  carriesTemplate = false
}) => ({
  types,
  backLink,
  destination,
  carriesTemplate,
  rules: requiredOneOf(FIELD, valuesOf(types), copy.errors.notificationType)
})

// Choosing a type for a notification starts the notification; choosing one for
// a template names the template. The question, its wording and its controls
// are the same either way.
const NOTIFICATION_MODE = modeFor({
  types: NOTIFICATION_TYPES,
  backLink: dashboardPath,
  destination: (value) => startUrlFor(value)
})

const TEMPLATE_MODE = modeFor({
  types: TEMPLATE_TYPES,
  backLink: manageTemplatesUrl,
  destination: (value, templateId) => templateNameUrlFor(value, templateId),
  carriesTemplate: true
})

const itemsOf = (types, selected) =>
  types.map(({ value, copyKey }) => ({
    value,
    text: copy.options[copyKey],
    checked: value === selected
  }))

const buildView = (h, mode, { selected, templateId, errors = {} } = {}) =>
  h
    .view(view, {
      ...kit.base(copy.title, { backLink: mode.backLink() }),
      copy,
      errors,
      errorSummary: kit.errorSummary(errors),
      items: itemsOf(mode.types, selected),
      templateId
    })
    .header('Cache-Control', 'no-store')

const handlersFor = (mode) => ({
  get: (request, h) => {
    if (!mode.carriesTemplate) {
      return buildView(h, mode)
    }
    const { type, template } = request.query ?? {}
    return buildView(h, mode, {
      selected: valuesOf(mode.types).includes(type) ? type : undefined,
      templateId: templateIdOf(template)
    })
  },
  post: (request, h) => {
    const selected = request.payload?.[FIELD]
    const templateId = mode.carriesTemplate
      ? templateIdOf(request.payload?.[TEMPLATE_FIELD])
      : undefined
    const { errors, value } = validate(mode.rules, { [FIELD]: selected })
    if (errors) {
      return buildView(h, mode, { selected, templateId, errors }).code(
        HTTP_STATUS_BAD_REQUEST
      )
    }
    return h.redirect(mode.destination(value[FIELD], templateId))
  }
})

export const routes = [
  ...kit.pageRoutes(notificationTypePath(), handlersFor(NOTIFICATION_MODE)),
  ...kit.pageRoutes(templateNotificationTypePath(), handlersFor(TEMPLATE_MODE))
]
