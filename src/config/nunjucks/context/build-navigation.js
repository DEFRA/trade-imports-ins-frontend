import {
  addressBookList,
  isAddressBookPath
} from '#/server/common/constants/routes.js'

export function buildNavigation(request) {
  const path = request?.path ?? ''

  return [
    {
      text: 'Dashboard',
      href: '/',
      current: path === '/'
    },
    {
      text: 'Address book',
      href: addressBookList(),
      current: isAddressBookPath(path)
    }
  ]
}
