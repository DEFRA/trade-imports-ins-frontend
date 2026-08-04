import { vi } from 'vitest'

const { mapApiErrorsToFormErrors } = await vi.importActual(
  '#/server/common/clients/address-book-client.js'
)

export { mapApiErrorsToFormErrors }

export const addressBookClient = {
  listAddresses: vi.fn(),
  createAddress: vi.fn(),
  getAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn()
}
