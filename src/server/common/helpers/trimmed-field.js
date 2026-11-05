export const trimmedField = (source, name) => {
  const value = source?.[name]
  return typeof value === 'string' ? value.trim() : ''
}
