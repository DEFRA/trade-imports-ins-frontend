import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const load = (file) =>
  JSON.parse(readFileSync(join(HERE, 'fixtures', file), 'utf8'))

export const countries = load('countries.json')
