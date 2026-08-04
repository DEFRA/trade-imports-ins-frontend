function getSafeRedirect(redirect) {
  if (
    !redirect?.startsWith('/') ||
    redirect.startsWith('//') ||
    redirect.includes('://')
  ) {
    return '/'
  }
  return redirect
}

export { getSafeRedirect }
