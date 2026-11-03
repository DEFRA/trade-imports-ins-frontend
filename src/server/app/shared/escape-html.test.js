import { describe, expect, test } from 'vitest'

import { escapeHtml } from './escape-html.js'

describe('#escapeHtml', () => {
  test('Should escape ampersands, angle brackets, double quotes and apostrophes', () => {
    expect(escapeHtml(`Tom & "Jerry" <Farm> O'Brien`)).toBe(
      'Tom &amp; &quot;Jerry&quot; &lt;Farm&gt; O&#39;Brien'
    )
  })
})
