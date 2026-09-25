export const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

export const isCopyLeaf = (value) =>
  typeof value === 'function' ||
  (typeof value === 'string' && value.trim().length > 0)
