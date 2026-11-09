export const dashboardPath = () => '/'
export const notificationTypePath = () => '/notification-type'
export const addressBookPath = () => '/address-book'
export const addressAddPath = () => '/address-book/add'
export const addressTypePath = () => `${addressAddPath()}/address-type`
const ADDRESS_TYPE_START_QUERY = { start: 'true' }
export const addressTypeStartPath = () =>
  `${addressTypePath()}?${new URLSearchParams(ADDRESS_TYPE_START_QUERY)}`
export const isAddressTypeStart = (query) =>
  query.start === ADDRESS_TYPE_START_QUERY.start
export const transporterTypePath = () => `${addressAddPath()}/transporter`
const TRANSPORTER_TYPE_START_QUERY = { start: 'true' }
export const transporterTypeStartPath = () =>
  `${transporterTypePath()}?${new URLSearchParams(TRANSPORTER_TYPE_START_QUERY)}`
export const isTransporterTypeStart = (query) =>
  query.start === TRANSPORTER_TYPE_START_QUERY.start
export const privateTransporterPath = () => `${transporterTypePath()}/private`
export const commercialTransporterPath = () =>
  `${transporterTypePath()}/commercial`
export const transporterPath = (id) =>
  `${addressBookPath()}/transporter/${encodeURIComponent(id)}`
export const transporterRoutePath = () =>
  `${addressBookPath()}/transporter/{id}`
export const transporterEditPath = (id) => `${transporterPath(id)}/edit`
export const transporterEditRoutePath = () => `${transporterRoutePath()}/edit`
export const transporterDeletePath = (id) => `${transporterPath(id)}/delete`
export const transporterDeleteRoutePath = () =>
  `${transporterRoutePath()}/delete`
export const addressPath = (id) => `/address-book/${encodeURIComponent(id)}`
export const addressRoutePath = () => '/address-book/{id}'
export const addressEditPath = (id) => `${addressPath(id)}/edit`
export const addressEditRoutePath = () => `${addressRoutePath()}/edit`
export const addressDeletePath = (id) => `${addressPath(id)}/delete`
export const addressDeleteRoutePath = () => `${addressRoutePath()}/delete`

export const inDashboardSection = (path) =>
  path === dashboardPath() || path === notificationTypePath()
export const inAddressBookSection = (path) =>
  path === addressBookPath() || path.startsWith(`${addressBookPath()}/`)
