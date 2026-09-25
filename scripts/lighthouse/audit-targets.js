import { allRoutes } from '../../src/server/app/features/index.js'

const ID_PARAM = '{id}'
const OTHER_PARAM = /\{(?!id})[^}]+}/
const ROUTE_PARAM_BRACES = /[{}]/g
const NOT_FILENAME_SAFE = /[^a-z0-9]+/gi
const ROOT_REPORT_NAME = 'home'

export const TARGETS_FILE = new URL(
  '../../.lighthouse/targets.json',
  import.meta.url
)

export const SKIPPED = new Map()

export const QUERY = new Map()

const getPathsOf = (routes) =>
  routes.filter(({ method }) => method === 'GET').map(({ path }) => path)

const assertStillRouted = (paths, listed, label) => {
  for (const path of listed) {
    if (!paths.includes(path)) {
      throw new Error(
        `Lighthouse ${label} names ${path}, which the app no longer serves as a GET route`
      )
    }
  }
}

export const assertTargetsAreCurrent = (routes = allRoutes) => {
  const paths = getPathsOf(routes)
  assertStillRouted(paths, SKIPPED.keys(), 'skip list')
  assertStillRouted(paths, QUERY.keys(), 'query list')

  const unsatisfiable = paths.filter(
    (path) => !SKIPPED.has(path) && OTHER_PARAM.test(path)
  )
  if (unsatisfiable.length > 0) {
    throw new Error(
      `Lighthouse cannot build a URL for ${unsatisfiable.join(', ')} — satisfy the ` +
        'extra path parameter or add the route to SKIPPED with a reason'
    )
  }
}

export const auditableRoutePaths = (routes = allRoutes) => {
  assertTargetsAreCurrent(routes)
  return getPathsOf(routes).filter((path) => !SKIPPED.has(path))
}

const requireAddressId = (addressId, path) => {
  if (!addressId) {
    throw new Error(
      `Lighthouse audits ${path} on the seeded address, which the setup step did not create`
    )
  }
  return encodeURIComponent(addressId)
}

const resolvePath = (path, addressId) =>
  path.includes(ID_PARAM)
    ? path.replace(ID_PARAM, requireAddressId(addressId, path))
    : path

export const auditPaths = (addressId, routes = allRoutes) =>
  auditableRoutePaths(routes).map(
    (path) => `${resolvePath(path, addressId)}${QUERY.get(path) ?? ''}`
  )

export const auditUrls = (origin, addressId, routes = allRoutes) =>
  auditPaths(addressId, routes).map((path) => new URL(path, origin).toString())

export const reportName = (routePath) => {
  const name = routePath
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => segment.replace(ROUTE_PARAM_BRACES, ''))
    .join('_')
    .replace(NOT_FILENAME_SAFE, '_')
  return name === '' ? ROOT_REPORT_NAME : name
}

export const reportNames = (origin, addressId, routes = allRoutes) => {
  const paths = auditableRoutePaths(routes)
  const urls = auditUrls(origin, addressId, routes)
  const taken = new Map()
  const names = {}
  for (const [index, path] of paths.entries()) {
    const url = urls[index]
    const name = reportName(path)
    if (taken.has(name)) {
      throw new Error(
        `Lighthouse would write both ${taken.get(name)} and ${url} to ${name}.report.html — ` +
          'one of the two routes needs a path the other does not share'
      )
    }
    taken.set(name, url)
    names[url] = name
  }
  return names
}
