import { escapeHtml } from '../../shared/escape-html.js'

export const linesHtml = (lines, { lineEnding = '' } = {}) =>
  lines.map(escapeHtml).join(`${lineEnding}<br> `)
