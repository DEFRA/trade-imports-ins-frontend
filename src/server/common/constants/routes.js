export const ADDRESS_BOOK_BASE = '/address-book'

const ADDRESS_BOOK_ADD_SEGMENT = 'add'
const ADDRESS_BOOK_EDIT_SEGMENT = 'edit'
const ADDRESS_BOOK_DELETE_SEGMENT = 'delete'
const ADDRESS_BOOK_ID_PARAM = '{id}'

export const buildAddressBookRoutes = (base = ADDRESS_BOOK_BASE) => ({
  list: () => base,
  add: () => `${base}/${ADDRESS_BOOK_ADD_SEGMENT}`,
  viewPath: () => `${base}/${ADDRESS_BOOK_ID_PARAM}`,
  view: (id) => `${base}/${id}`,
  editPath: () => `${base}/${ADDRESS_BOOK_ID_PARAM}/${ADDRESS_BOOK_EDIT_SEGMENT}`,
  edit: (id) => `${base}/${id}/${ADDRESS_BOOK_EDIT_SEGMENT}`,
  deletePath: () =>
    `${base}/${ADDRESS_BOOK_ID_PARAM}/${ADDRESS_BOOK_DELETE_SEGMENT}`,
  delete: (id) => `${base}/${id}/${ADDRESS_BOOK_DELETE_SEGMENT}`,
  isAddressBookPath: (path) => path.startsWith(base)
})

const addressBookRoutes = buildAddressBookRoutes()

export const addressBookListPath = addressBookRoutes.list
export const addressBookAddPath = addressBookRoutes.add
export const addressBookList = addressBookRoutes.list
export const addressBookAdd = addressBookRoutes.add
export const addressBookViewPath = addressBookRoutes.viewPath
export const addressBookView = addressBookRoutes.view
export const addressBookEditPath = addressBookRoutes.editPath
export const addressBookEdit = addressBookRoutes.edit
export const addressBookDeletePath = addressBookRoutes.deletePath
export const addressBookDelete = addressBookRoutes.delete
export const isAddressBookPath = addressBookRoutes.isAddressBookPath
