export const SUCCESS_BANNER_DISMISS_MS = 3000

export function initAddressBookSuccessBanner(
  rootDocument = document,
  dismissMs = SUCCESS_BANNER_DISMISS_MS
) {
  const banner = rootDocument.getElementById('address-book-success-banner')

  if (banner) {
    setTimeout(() => {
      banner.hidden = true
    }, dismissMs)
  }
}
