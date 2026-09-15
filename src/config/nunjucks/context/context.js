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

/**
 * Which service-navigation item the current request sits under, so the layout
 * can mark it active. Section-wide, not page-wide: every address-book page is
 * inside the address book's section of the service, which is why the answer
 * for `/address-book/123/edit` is still `addressBook`.
 *
 * @param {string} [requestPath] - the request path.
 * @returns {string|null} the id of the active navigation item, or null when the
 * request is under none of them.
 */
export function activeNavigationItem(requestPath = '') {
  if (inDashboardSection(requestPath)) {
    return 'dashboard'
  }
  if (inAddressBookSection(requestPath)) {
    return 'addressBook'
  }
  return null
}

export function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
    }
  }

  const authData = request.auth?.isAuthenticated
    ? request.auth.credentials
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
          displayName: authData.name || authData.email || 'User',
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
