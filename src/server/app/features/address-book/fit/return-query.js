export const withReturn = (path, returnTo) =>
  returnTo === undefined
    ? path
    : `${path}?${new URLSearchParams({ return: returnTo })}`
