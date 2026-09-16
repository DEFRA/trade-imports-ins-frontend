import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'

import puppeteer from 'puppeteer'

import signIn from '../../tests/lighthouse/auth-setup.cjs'
import { auditUrls, reportNames, TARGETS_FILE } from './audit-targets.js'
import { createPageClient } from './page-client.js'
import { seedAddress } from './seed-address.js'

const HTTP_OK = 200

const origin = process.env.LIGHTHOUSE_BASE_URL ?? 'http://localhost:3002'

const signedInCookies = async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-gpu']
  })
  try {
    await signIn(browser, { url: origin })
    const { hostname } = new URL(origin)
    return (await browser.cookies()).filter(({ domain }) =>
      hostname.endsWith(domain.replace(/^\./, ''))
    )
  } finally {
    await browser.close()
  }
}

/** Every URL is fetched once more before Lighthouse sees it, so a page that
 * redirects or 404s — a seeded address the book no longer holds, say — fails
 * here with its status rather than silently auditing whatever it landed on. */
const assertUrlsRenderTheirOwnPage = async (urls, client) => {
  const failures = []
  for (const url of urls) {
    const page = await client.document(url)
    if (page.status !== HTTP_OK) {
      failures.push(`${url} -> ${page.status} ${page.location ?? ''}`.trim())
    } else if (!page.heading) {
      failures.push(`${url} -> 200 but no heading`)
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Lighthouse targets do not render their own page:\n  ${failures.join('\n  ')}`
    )
  }
}

const write = (payload) => {
  mkdirSync(dirname(TARGETS_FILE.pathname), { recursive: true })
  writeFileSync(TARGETS_FILE, `${JSON.stringify(payload, null, 2)}\n`)
}

const client = createPageClient(origin, await signedInCookies())
const addressId = await seedAddress(client)
const urls = auditUrls(origin, addressId)
await assertUrlsRenderTheirOwnPage(urls, client)
write({ origin, addressId, urls, reports: reportNames(origin, addressId) })

process.stdout.write(
  `Lighthouse will audit ${urls.length} URLs on ${origin} (address ${addressId})\n`
)
