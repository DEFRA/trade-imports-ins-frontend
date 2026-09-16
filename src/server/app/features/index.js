import * as dashboard from './dashboard/controller.js'
import * as addressBookList from './address-book/list/list.controller.js'
import * as addressBookAdd from './address-book/add/add.controller.js'
import * as addressBookView from './address-book/view/view.controller.js'
import * as addressBookEdit from './address-book/edit/edit.controller.js'
import * as addressBookDelete from './address-book/delete/delete.controller.js'

export const allRoutes = [
  ...dashboard.routes,
  ...addressBookList.routes,
  ...addressBookAdd.routes,
  ...addressBookView.routes,
  ...addressBookEdit.routes,
  ...addressBookDelete.routes
]
