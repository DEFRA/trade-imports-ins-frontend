import nock from 'nock'
import { beforeAll, afterAll, describe, expect, test } from 'vitest'

import { config } from '../../../../config/config.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import {
  ORGANISATION_ID_HEADER,
  transportersApiPath
} from '../../../common/test-helpers/address-book-requests.js'
import {
  addressBookApi,
  runInRealMode
} from '../../../common/test-helpers/real-mode.js'
import { ORGANISATION_ID } from '../../../common/test-helpers/session-auth.js'
import * as transporters from './index.js'
import {
  NORTHERN_IRELAND_COUNTRY_CODE,
  TRANSPORTER_TYPES
} from './transporter-types.js'
import {
  APPROVAL_NUMBER,
  FIRST_HAULAGE,
  SECOND_HAULAGE,
  anOrganisation,
  commercialTransporter,
  createTwoTransporters,
  privateTransporter
} from './transporters.test-helpers.js'

const refusalFrom = async (call) => {
  try {
    await call()
  } catch (error) {
    return error.body.errors
  }
  return null
}

describe('the stub transporters service', () => {
  describe('#listTransporters', () => {
    test('Should read an organisation with no transporters as an empty first page', async () => {
      expect(
        await transporters.listTransporters(anOrganisation(), {
          pageSize: 25
        })
      ).toEqual({
        items: [],
        page: 1,
        pageSize: 25,
        totalItems: 0,
        totalPages: 0
      })
    })

    test('Should offer a newly added transporter at the top of the list', async () => {
      const organisationId = anOrganisation()
      await createTwoTransporters(organisationId)

      const page = await transporters.listTransporters(organisationId, {
        pageSize: 25
      })

      expect(page.items.map(({ name }) => name)).toEqual([
        SECOND_HAULAGE,
        FIRST_HAULAGE
      ])
      expect(page.totalItems).toBe(2)
    })

    test('Should offer every live transporter when no search or filter is given', async () => {
      const organisationId = anOrganisation()
      await transporters.createTransporter(organisationId, privateTransporter())
      await transporters.createTransporter(
        organisationId,
        commercialTransporter()
      )

      const page = await transporters.listTransporters(organisationId, {
        pageSize: 25
      })

      expect(page.totalItems).toBe(2)
    })

    test('Should keep only the types asked for', async () => {
      const organisationId = anOrganisation()
      await transporters.createTransporter(organisationId, privateTransporter())
      await transporters.createTransporter(
        organisationId,
        commercialTransporter()
      )

      const page = await transporters.listTransporters(organisationId, {
        pageSize: 25,
        types: [TRANSPORTER_TYPES.COMMERCIAL]
      })

      expect(page.items.map(({ type }) => type)).toEqual([
        TRANSPORTER_TYPES.COMMERCIAL
      ])
    })

    test.each([
      ['a name', 'aberdeen', privateTransporter],
      ['an address line', 'drovers', privateTransporter],
      ['a town or city', 'ABERDEEN', privateTransporter],
      ['a postcode', 'ab10', privateTransporter],
      ['an approval number', '00104115', commercialTransporter]
    ])(
      'Should match a search term against %s',
      async (_, searchTerm, transporterFixture) => {
        const organisationId = anOrganisation()
        await transporters.createTransporter(
          organisationId,
          transporterFixture()
        )

        const page = await transporters.listTransporters(organisationId, {
          pageSize: 25,
          searchTerm
        })

        expect(page.totalItems).toBe(1)
      }
    )

    test('Should leave out a transporter no search field matches', async () => {
      const organisationId = anOrganisation()
      await transporters.createTransporter(organisationId, privateTransporter())

      const page = await transporters.listTransporters(organisationId, {
        pageSize: 25,
        searchTerm: 'nothing here matches'
      })

      expect(page.items).toEqual([])
    })

    test('Should match a country code as well as a search term', async () => {
      const organisationId = anOrganisation()
      await transporters.createTransporter(
        organisationId,
        commercialTransporter()
      )

      const page = await transporters.listTransporters(organisationId, {
        pageSize: 25,
        countryCodes: [NORTHERN_IRELAND_COUNTRY_CODE]
      })

      expect(page.totalItems).toBe(1)
    })

    test('Should match a search type as well as a search term', async () => {
      const organisationId = anOrganisation()
      await transporters.createTransporter(organisationId, privateTransporter())

      const page = await transporters.listTransporters(organisationId, {
        pageSize: 25,
        searchTypes: [TRANSPORTER_TYPES.PRIVATE]
      })

      expect(page.totalItems).toBe(1)
    })

    test('Should serve the page asked for, counting every match', async () => {
      const organisationId = anOrganisation()
      await createTwoTransporters(organisationId)

      const page = await transporters.listTransporters(organisationId, {
        page: 2,
        pageSize: 1
      })

      expect(page.items.map(({ name }) => name)).toEqual([FIRST_HAULAGE])
      expect(page.totalItems).toBe(2)
      expect(page.totalPages).toBe(2)
    })
  })

  describe('#createTransporter', () => {
    test('Should store a private transporter with its own id and not deleted', async () => {
      const created = await transporters.createTransporter(
        anOrganisation(),
        privateTransporter()
      )

      expect(created.id).toMatch(/^[0-9a-f]{24}$/)
      expect(created.deleted).toBe(false)
      expect(created.name).toBe('Aberdeen Livestock Ltd')
    })

    test('Should store a commercial transporter in Northern Ireland with an approval number', async () => {
      const created = await transporters.createTransporter(
        anOrganisation(),
        commercialTransporter()
      )

      expect(created.approvalNumber).toBe(APPROVAL_NUMBER)
      expect(created.countryCode).toBe(NORTHERN_IRELAND_COUNTRY_CODE)
    })

    test('Should refuse a commercial transporter with no approval number', async () => {
      const errors = await refusalFrom(() =>
        transporters.createTransporter(
          anOrganisation(),
          commercialTransporter({ approvalNumber: null })
        )
      )

      expect(errors).toEqual({
        approvalNumber: ['Enter the approval number']
      })
    })

    test('Should refuse a commercial transporter outside Northern Ireland', async () => {
      const errors = await refusalFrom(() =>
        transporters.createTransporter(
          anOrganisation(),
          commercialTransporter({ countryCode: 'GB' })
        )
      )

      expect(errors).toEqual({
        countryCode: ['A commercial transporter must be in Northern Ireland']
      })
    })

    test('Should refuse a private transporter carrying an approval number', async () => {
      const errors = await refusalFrom(() =>
        transporters.createTransporter(
          anOrganisation(),
          privateTransporter({ approvalNumber: APPROVAL_NUMBER })
        )
      )

      expect(errors).toEqual({
        approvalNumber: [
          'A private transporter must not have an approval number'
        ]
      })
    })
  })
})

describe('the real transporters service', () => {
  runInRealMode()

  describe('#listTransporters', () => {
    test('Should GET the organisation path with the organisation header and parse the page', async () => {
      const scope = addressBookApi()
        .get(transportersApiPath())
        .query({ page: '1', pageSize: '25' })
        .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
        .reply(statusCodes.ok, {
          items: [],
          page: 1,
          pageSize: 25,
          totalItems: 0,
          totalPages: 0
        })

      const page = await transporters.listTransporters(ORGANISATION_ID, {
        pageSize: 25
      })

      expect(page.totalItems).toBe(0)
      expect(scope.isDone()).toBe(true)
    })

    test('Should carry the search term, country codes, types and search types as repeated query parameters', async () => {
      let sent
      const scope = addressBookApi()
        .get(transportersApiPath())
        .query((query) => {
          sent = query
          return true
        })
        .reply(statusCodes.ok, { items: [], page: 1, pageSize: 25 })

      await transporters.listTransporters(ORGANISATION_ID, {
        pageSize: 25,
        searchTerm: 'aberdeen',
        types: [TRANSPORTER_TYPES.PRIVATE, TRANSPORTER_TYPES.COMMERCIAL],
        countryCodes: ['GB', NORTHERN_IRELAND_COUNTRY_CODE],
        searchTypes: [TRANSPORTER_TYPES.COMMERCIAL]
      })

      expect(scope.isDone()).toBe(true)
      expect(sent).toEqual({
        page: '1',
        pageSize: '25',
        q: 'aberdeen',
        type: [TRANSPORTER_TYPES.PRIVATE, TRANSPORTER_TYPES.COMMERCIAL],
        countryCode: ['GB', NORTHERN_IRELAND_COUNTRY_CODE],
        searchType: TRANSPORTER_TYPES.COMMERCIAL
      })
    })
  })

  describe('#createTransporter', () => {
    test('Should POST the transporter and parse the created record', async () => {
      const scope = addressBookApi()
        .post(transportersApiPath(), privateTransporter())
        .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
        .reply(statusCodes.created, {
          id: '775f1c2ab3e4d51a2c9d0e88',
          ...privateTransporter()
        })

      const created = await transporters.createTransporter(
        ORGANISATION_ID,
        privateTransporter()
      )

      expect(created.id).toBe('775f1c2ab3e4d51a2c9d0e88')
      expect(scope.isDone()).toBe(true)
    })
  })
})

describe('choosing between the stub and the real address book', () => {
  const originalStubMode = config.get('stubMode')

  beforeAll(() => {
    nock.disableNetConnect()
  })

  afterAll(() => {
    config.set('stubMode', originalStubMode)
    nock.enableNetConnect()
  })

  test('Should answer from the stub in stub mode, making no outbound call', async () => {
    config.set('stubMode', true)

    const page = await transporters.listTransporters(anOrganisation(), {
      pageSize: 25
    })

    expect(page.totalItems).toBe(0)
  })

  test('Should call the real address book outside stub mode', async () => {
    config.set('stubMode', false)
    const scope = addressBookApi()
      .get(transportersApiPath())
      .query(true)
      .reply(statusCodes.ok, { items: [], page: 1, pageSize: 25 })

    await transporters.listTransporters(ORGANISATION_ID, { pageSize: 25 })

    expect(scope.isDone()).toBe(true)
  })
})
