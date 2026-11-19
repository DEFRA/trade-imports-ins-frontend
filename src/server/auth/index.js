import { unauthorisedPage } from '../app/auth/page.js'
import { SERVICE_SIGN_IN_STRATEGY } from '../../plugins/auth.js'
import { authController, SIGN_IN_PATH } from './controller.js'

export const authRoutes = {
  plugin: {
    name: 'auth-routes',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: SIGN_IN_PATH,
          options: {
            auth: SERVICE_SIGN_IN_STRATEGY
          },
          ...authController.signin
        },
        {
          method: 'GET',
          path: '/auth/sign-in-oidc',
          options: {
            auth: { strategy: SERVICE_SIGN_IN_STRATEGY, mode: 'try' },
            app: { page: unauthorisedPage }
          },
          ...authController.signinOidc
        },
        {
          method: 'GET',
          path: '/auth/sign-out',
          options: {
            auth: { mode: 'try' }
          },
          ...authController.signout
        },
        {
          method: 'GET',
          path: '/auth/sign-out-oidc',
          options: {
            auth: { mode: 'try' }
          },
          ...authController.signoutOidc
        },
        {
          method: 'GET',
          path: '/auth/organisation',
          options: {
            auth: SERVICE_SIGN_IN_STRATEGY
          },
          ...authController.organisation
        }
      ])
    }
  }
}
