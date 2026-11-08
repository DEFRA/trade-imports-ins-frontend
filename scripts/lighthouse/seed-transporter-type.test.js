import nock from 'nock'
import { describe, expect, test } from 'vitest'

import { refuseOutboundHttp } from '../../src/server/common/test-helpers/real-mode.js'
import { createPageClient } from './page-client.js'
import {
  AUDIT_TRANSPORTER_TYPE,
  chooseTransporterType
} from './seed-transporter-type.js'

const ORIGIN = 'http://localhost:3002'
const CRUMB = 'crumb-token'
const TYPE_PATH = '/address-book/add/transporter'
const COMMERCIAL_PATH = '/address-book/add/transporter/commercial'
const HTTP_OK = 200
const HTTP_FOUND = 302
const HTTP_BAD_REQUEST = 400
const HTTP_SERVER_ERROR = 500

const page = (body) =>
  `<html><head><meta name="csrf-token" content="${CRUMB}"></head><body><h1>Page</h1>${body}</body></html>`

const MOVED_ON_TO_COMMERCIAL_FORM = [
  HTTP_FOUND,
  '',
  { location: COMMERCIAL_PATH }
]

const serveTypeStep = ({
  pageStatus = HTTP_OK,
  postReply = MOVED_ON_TO_COMMERCIAL_FORM
} = {}) =>
  nock(ORIGIN)
    .get(TYPE_PATH)
    .reply(pageStatus, page('<form></form>'))
    .post(TYPE_PATH, { crumb: CRUMB, transporterType: 'COMMERCIAL' })
    .reply(...postReply)

describe('#AUDIT_TRANSPORTER_TYPE', () => {
  test('Should audit the commercial form, the one carrying every private field and the approval number', () => {
    expect(AUDIT_TRANSPORTER_TYPE).toBe('COMMERCIAL')
  })
})

describe('#chooseTransporterType', () => {
  refuseOutboundHttp()

  test('Should choose the audited type on the transporter type question, posting the crumb the page issued', async () => {
    const typeStep = serveTypeStep()

    await chooseTransporterType(createPageClient(ORIGIN))

    expect(typeStep.isDone()).toBe(true)
  })

  test('Should refuse when the type question does not move on to the form it audits', async () => {
    serveTypeStep({
      postReply: [
        HTTP_BAD_REQUEST,
        page('<div role="alert">There is a problem</div>')
      ]
    })

    await expect(
      chooseTransporterType(createPageClient(ORIGIN))
    ).rejects.toThrow(
      'The transporter type page did not move on to the commercial transporter form (400)'
    )
  })

  test('Should refuse when it moves on to another page', async () => {
    serveTypeStep({
      postReply: [HTTP_FOUND, '', { location: '/address-book' }]
    })

    await expect(
      chooseTransporterType(createPageClient(ORIGIN))
    ).rejects.toThrow('(302 to /address-book)')
  })

  test('Should refuse when the type question does not render', async () => {
    serveTypeStep({ pageStatus: HTTP_SERVER_ERROR })

    await expect(
      chooseTransporterType(createPageClient(ORIGIN))
    ).rejects.toThrow('The transporter type page did not render (500)')
  })
})
