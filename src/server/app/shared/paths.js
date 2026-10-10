export const dashboardPath = () => '/'
export const notificationTypePath = () => '/notification-type'
export const addressBookPath = () => '/address-book'
export const addressAddPath = () => '/address-book/add'
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
