import * as dashboard from './dashboard/controller.js'
import * as notificationType from './notification-type/controller.js'
import * as addressBookList from './address-book/list/list.controller.js'
import * as addressBookAdd from './address-book/add/add.controller.js'
import * as addressBookAddressType from './address-book/address-type/address-type.controller.js'
import * as addressBookView from './address-book/view/view.controller.js'
import * as addressBookEdit from './address-book/edit/edit.controller.js'
import * as addressBookDelete from './address-book/delete/delete.controller.js'
import * as transporterType from './address-book/transporter/transporter-type.controller.js'
import * as privateTransporter from './address-book/transporter/private-transporter.controller.js'
import * as commercialTransporter from './address-book/transporter/commercial-transporter.controller.js'
import * as transporterView from './address-book/transporter/view.controller.js'

export const allRoutes = [
  ...dashboard.routes,
  ...notificationType.routes,
  ...addressBookList.routes,
  ...addressBookAdd.routes,
  ...addressBookAddressType.routes,
  ...addressBookView.routes,
  ...addressBookEdit.routes,
  ...addressBookDelete.routes,
  ...transporterType.routes,
  ...privateTransporter.routes,
  ...commercialTransporter.routes,
  ...transporterView.routes
]
