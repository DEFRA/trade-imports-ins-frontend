import { unauthorisedPage } from '../app/auth/page.js'
import { SERVICE_SIGN_IN_STRATEGY } from '../../plugins/auth.js'
import { authController, authPaths } from './controller.js'

export const authRoutes = {
  plugin: {
    name: 'auth-routes',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: authPaths.signIn,
          options: {
            auth: SERVICE_SIGN_IN_STRATEGY
          },
          ...authController.signin
        },
        {
          method: 'GET',
          path: authPaths.signInOidc,
          options: {
            auth: { strategy: SERVICE_SIGN_IN_STRATEGY, mode: 'try' },
            app: { page: unauthorisedPage }
          },
          ...authController.signinOidc
        },
        {
          method: 'GET',
          path: authPaths.signOut,
          options: {
            auth: { mode: 'try' }
          },
          ...authController.signout
        },
        {
          method: 'GET',
          path: authPaths.signOutOidc,
          options: {
            auth: { mode: 'try' }
          },
          ...authController.signoutOidc
        },
        {
          method: 'GET',
          path: authPaths.organisation,
          options: {
            auth: SERVICE_SIGN_IN_STRATEGY
          },
          ...authController.organisation
        }
      ])
    }
  }
}
