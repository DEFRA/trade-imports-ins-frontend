/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 */
export const homeController = {
  handler(_request, h) {
    return h.view('routes/home/index', {
      pageTitle: 'Dashboard',
      heading: 'Dashboard'
    })
  }
}
