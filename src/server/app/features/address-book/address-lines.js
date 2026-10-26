import { escapeHtml } from '../../shared/list-page.js'

export const addressLinesHtml = (lines, lineSeparator = '') =>
  lines.map(escapeHtml).join(`${lineSeparator}<br> `)
