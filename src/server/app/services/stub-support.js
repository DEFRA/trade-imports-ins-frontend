import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_NOT_FOUND
} from '../lib/http-status.js'

export const OBJECT_ID_LENGTH = 24

export const notFound = () =>
  Object.assign(new Error('Not found'), { status: HTTP_STATUS_NOT_FOUND })

export const newObjectId = () =>
  crypto.randomUUID().replaceAll('-', '').slice(0, OBJECT_ID_LENGTH)

export const isLive = (record) => !record.deleted

export const pageOfMatches = (matches, { page, pageSize }) => ({
  items: matches.slice((page - 1) * pageSize, page * pageSize),
  page,
  pageSize,
  totalItems: matches.length,
  totalPages: Math.ceil(matches.length / pageSize)
})

export const throwIfInvalid = (errors) => {
  if (errors) {
    throw Object.assign(new Error('Validation failed'), {
      status: HTTP_STATUS_BAD_REQUEST,
      body: { errors }
    })
  }
}
