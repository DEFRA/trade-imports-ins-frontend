const probeTimeoutMs = 5_000

const services = [
  {
    name: 'trade-imports-ins-backend',
    url: process.env.TRADE_IMPORTS_INS_BACKEND_URL ?? 'http://localhost:8090'
  },
  {
    name: 'trade-imports-address-book',
    url: process.env.TRADE_IMPORTS_ADDRESS_BOOK_URL ?? 'http://localhost:8089'
  },
  {
    name: 'trade-imports-reference-data',
    url: process.env.TRADE_IMPORTS_REFERENCE_DATA_URL ?? 'http://localhost:8086'
  }
]

const isReachable = ({ url }) =>
  fetch(`${url}/health`, { signal: AbortSignal.timeout(probeTimeoutMs) })
    .then(() => true)
    .catch(() => false)

const reachability = await Promise.all(services.map(isReachable))
const unreachable = services.filter((service, index) => !reachability[index])

if (unreachable.length > 0) {
  process.stderr.write(
    [
      '',
      'The E2E workspace stack check failed — these services did not answer:',
      ...unreachable.map(({ name, url }) => `  ${name}  ${url}/health`),
      '',
      '  Start it:  scripts/stack/run-stack.sh   (from the trade-imports-workspace)',
      '',
      'Start the backends, Mongo and Redis before running workspace-backed E2E checks.',
      ''
    ].join('\n')
  )
  process.exit(1)
}
