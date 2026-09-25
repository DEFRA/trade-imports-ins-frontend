import Blankie from 'blankie'

import { siblingFrontendBaseUrls } from '../../../config/config.js'

const siblingFrontendOrigins = siblingFrontendBaseUrls.map(
  (baseUrl) => new URL(baseUrl).origin
)

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
    formAction: ['self', ...siblingFrontendOrigins],
    manifestSrc: ['self'],
    generateNonces: false
  }
}

export { contentSecurityPolicy }
