const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const TARGETS_FILE = join(__dirname, '.lighthouse', 'targets.json')

const collectUrls = () => {
  let targets
  try {
    targets = JSON.parse(readFileSync(TARGETS_FILE, 'utf8'))
  } catch (cause) {
    throw new Error(
      'No Lighthouse targets found — run `npm run lighthouse` so the setup ' +
        'step can seed an address and derive the URL list',
      { cause }
    )
  }
  if (!Array.isArray(targets.urls) || targets.urls.length === 0) {
    throw new Error(`Lighthouse targets file ${TARGETS_FILE} lists no URLs`)
  }
  return targets.urls
}

module.exports = {
  ci: {
    collect: {
      url: collectUrls(),
      puppeteerScript: './tests/lighthouse/auth-setup.cjs',
      puppeteerLaunchOptions: {
        args: ['--no-sandbox', '--disable-gpu']
      },
      numberOfRuns: 1,
      settings: {
        preset: 'desktop'
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.6 }],
        'categories:accessibility': ['error', { minScore: 0.7 }],
        'categories:best-practices': ['error', { minScore: 0.7 }]
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-report',
      reportFilenamePattern: '%%PATHNAME%%.report.%%EXTENSION%%'
    }
  }
}
