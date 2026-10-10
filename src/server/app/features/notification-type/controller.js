import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import { requiredOneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { dashboardPath, notificationTypePath } from '../../shared/paths.js'
import { NOTIFICATION_TYPES, startUrlFor } from './destinations.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const view = 'notification-type/template'
const copy = copyFor({ en, cy })
const FIELD = 'notificationType'

const rules = requiredOneOf(
  FIELD,
  NOTIFICATION_TYPES.map(({ value }) => value),
  copy.errors.notificationType
)

const itemsOf = (selected) =>
  NOTIFICATION_TYPES.map(({ value, copyKey }) => ({
    value,
    text: copy.options[copyKey],
    checked: value === selected
  }))

const buildView = (h, { selected, errors = {} } = {}) =>
  h
    .view(view, {
      ...kit.base(copy.title, { backLink: dashboardPath() }),
      copy,
      errors,
      errorSummary: kit.errorSummary(errors),
      items: itemsOf(selected)
    })
    .header('Cache-Control', 'no-store')

const get = (_request, h) => buildView(h)

const post = (request, h) => {
  const selected = request.payload?.[FIELD]
  const { errors, value } = validate(rules, { [FIELD]: selected })
  if (errors) {
    return buildView(h, { selected, errors }).code(HTTP_STATUS_BAD_REQUEST)
  }
  return h.redirect(startUrlFor(value[FIELD]))
}

export const routes = kit.pageRoutes(notificationTypePath(), { get, post })
