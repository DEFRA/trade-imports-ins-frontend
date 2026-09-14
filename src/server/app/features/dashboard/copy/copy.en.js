/**
 * The dashboard — the notifications an organisation has made, searchable by
 * reference and sortable by arrival or last update. `sort.options` is keyed
 * by the `copyKey` of each `SORT_OPTIONS` entry in `view-model/list.js`, so a
 * new sort arrives as one more leaf rather than a branch in the controller.
 */
export const copy = {
  title: 'Dashboard',
  search: {
    label: 'Search by notification reference',
    button: 'Search',
    clear: 'Clear search',
    noResults: 'No notifications found'
  },
  sort: {
    label: 'Sort by',
    update: 'Update sort',
    options: {
      arrivalNewest: 'Arrival date (newest first)',
      arrivalOldest: 'Arrival date (oldest first)',
      updatedNewest: 'Last updated (newest first)',
      updatedOldest: 'Last updated (oldest first)'
    }
  },
  results: (from, to, total) => `Showing ${from}-${to} of ${total}`,
  table: {
    caption: 'Notifications',
    reference: 'Reference number',
    status: 'Status',
    origin: 'Origin country',
    commodity: 'Commodity',
    arrival: 'Arrival date',
    action: 'Action',
    view: 'View'
  },
  empty: {
    text: 'There are no notifications yet.',
    startButton: 'Start a new notification'
  },
  errors: {
    load: 'Something went wrong loading the dashboard'
  }
}
