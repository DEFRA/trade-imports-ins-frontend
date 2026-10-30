const SAMPLE_ARGUMENTS = [1, 2, 3]

export const textOf = (value) =>
  typeof value === 'function' ? value(...SAMPLE_ARGUMENTS) : value
