// Unchecked, `packageManager`'s optional `+sha512` suffix or absence would silently install the literal package "undefined". This file stays past the npm-pin removal because `workflow_run`-triggered workflows still run main's copy of it against this branch.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PACKAGE_JSON_PATH = join(import.meta.dirname, '..', 'package.json')
const NPM_SPEC = /^npm@\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/

const fail = (reason) => {
  console.error(`${PACKAGE_JSON_PATH}: ${reason}`)
  process.exit(1)
}

const { packageManager } = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'))

if (typeof packageManager !== 'string' || packageManager === '') {
  fail('`packageManager` missing — it pins the npm CI and Docker install')
}

const [spec] = packageManager.split('+')

if (!NPM_SPEC.test(spec)) {
  fail(`\`packageManager\` must be npm@<version>, got: ${packageManager}`)
}

process.stdout.write(spec)
