function getSafeRedirect(redirect) {
  if (typeof redirect !== 'string' || !redirect.startsWith('/')) {
    return '/'
  }

  if (
    redirect.startsWith('//') ||
    redirect.includes('://') ||
    redirect.includes('\\') ||
    /[\r\n]/.test(redirect)
  ) {
    return '/'
  }

  // A parse-only sentinel: it gives the relative path an origin to resolve
  // against, so anything that escapes that origin can be rejected. It is never
  // fetched, and the scheme is arbitrary — https only so it doesn't read as an
  // insecure outbound URL.
  const parseBase = 'https://placeholder'

  try {
    const resolved = new URL(redirect, parseBase)
    if (resolved.origin !== parseBase) {
      return '/'
    }
    return redirect
  } catch {
    return '/'
  }
}

export { getSafeRedirect }
