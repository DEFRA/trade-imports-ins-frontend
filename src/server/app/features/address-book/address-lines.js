import { escapeHtml } from '../../shared/list-page.js'

export const addressLinesHtml = (lines, { lineEnding = '' } = {}) =>
  lines.map(escapeHtml).join(`${lineEnding}<br> `)
