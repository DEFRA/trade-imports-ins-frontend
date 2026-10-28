import { escapeHtml } from '../../shared/list-page.js'

export const linesHtml = (lines, { lineEnding = '' } = {}) =>
  lines.map(escapeHtml).join(`${lineEnding}<br> `)
