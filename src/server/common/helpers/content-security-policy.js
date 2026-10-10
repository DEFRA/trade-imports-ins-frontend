import Blankie from 'blankie'

import { config, siblingFrontendBaseUrls } from '../../../config/config.js'

const siblingFrontendOrigins = siblingFrontendBaseUrls.map(
  (baseUrl) => new URL(baseUrl).origin
)

// form-action is checked at every redirect hop of a form submission, so the
// Defra ID origin a journey frontend redirects to must be listed too.
const defraIdFormActionOrigins = config
  .get('defraId.formActionOrigins')
  .map((value) => new URL(value).origin)

const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    defaultSrc: ['self'],
    fontSrc: ['self', 'data:'],
    connectSrc: ['self', 'wss', 'data:'],
    mediaSrc: ['self'],
    styleSrc: ['self'],
    scriptSrc: [
      'self',
      "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"
    ],
    imgSrc: ['self', 'data:'],
    frameSrc: ['self', 'data:'],
    objectSrc: ['none'],
    frameAncestors: ['none'],
    formAction: [
      'self',
      ...siblingFrontendOrigins,
      ...defraIdFormActionOrigins
    ],
    manifestSrc: ['self'],
    generateNonces: false
  }
}

export { contentSecurityPolicy }
