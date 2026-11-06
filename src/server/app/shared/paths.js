export const dashboardPath = () => '/'
export const addressBookPath = () => '/address-book'
export const addressAddPath = () => '/address-book/add'
export const addressTypePath = () => `${addressAddPath()}/address-type`
const ADDRESS_TYPE_START_QUERY = { start: 'true' }
export const addressTypeStartPath = () =>
  `${addressTypePath()}?${new URLSearchParams(ADDRESS_TYPE_START_QUERY)}`
export const isAddressTypeStart = (query) =>
  query.start === ADDRESS_TYPE_START_QUERY.start
export const addressPath = (id) => `/address-book/${encodeURIComponent(id)}`
export const addressRoutePath = () => '/address-book/{id}'
export const addressEditPath = (id) => `${addressPath(id)}/edit`
export const addressEditRoutePath = () => `${addressRoutePath()}/edit`
export const addressDeletePath = (id) => `${addressPath(id)}/delete`
export const addressDeleteRoutePath = () => `${addressRoutePath()}/delete`

export const inDashboardSection = (path) => path === dashboardPath()
export const inAddressBookSection = (path) =>
  path === addressBookPath() || path.startsWith(`${addressBookPath()}/`)
