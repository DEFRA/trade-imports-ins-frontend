import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '../../config.js'
import { createLogger } from '../../../server/common/helpers/logging/logger.js'
import {
  addressBookPath,
  dashboardPath,
  inAddressBookSection,
  inDashboardSection
} from '../../../server/app/shared/paths.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

let webpackManifest

export function activeNavigationItem(requestPath = '') {
  if (inDashboardSection(requestPath)) {
    return 'dashboard'
  }
  if (inAddressBookSection(requestPath)) {
    return 'addressBook'
  }
  return null
}

async function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
    }
  }

  const sessionId = request.auth?.credentials?.sessionId
  const authData = sessionId
    ? await request.server.app.cache.get(sessionId)
    : null

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    authEnabled: config.get('auth.enabled'),
    activeNavigationItem: activeNavigationItem(request.path),
    dashboardUrl: dashboardPath(),
    addressBookUrl: addressBookPath(),
    userSession: authData
      ? {
          isAuthenticated: true,
          displayName: authData.displayName || authData.email || 'User',
          email: authData.email
        }
      : {
          isAuthenticated: false
        },
    getAssetPath(asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      return `${assetPath}/${webpackAssetPath ?? asset}`
    },
    crumb: request.plugins?.crumb ?? request.state?.crumb ?? ''
  }
}

export { context }
