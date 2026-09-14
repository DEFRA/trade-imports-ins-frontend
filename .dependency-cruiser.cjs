const APP = 'src/server/app'

module.exports = {
  forbidden: [
    {
      name: 'feature-isolation',
      comment:
        'A feature is self-contained and cannot import a sibling feature; capture groups keep this future-proof.',
      severity: 'error',
      from: { path: `^${APP}/features/([^/]+)/` },
      to: {
        path: `^${APP}/features/`,
        pathNot: `^${APP}/features/$1/`
      }
    },
    {
      name: 'routes-is-the-gateway',
      comment:
        'routes.js is the sole composition point allowed to import features/ from outside a feature.',
      severity: 'error',
      from: {
        path: `^${APP}/`,
        pathNot: [`^${APP}/features/`, `^${APP}/routes\\.js$`]
      },
      to: { path: `^${APP}/features/` }
    },
    {
      name: 'shared-and-lib-are-leaves',
      comment:
        'shared/ and lib/ are consumed by features and services and depend on neither.',
      severity: 'error',
      from: { path: `^${APP}/(shared|lib)/` },
      to: { path: `^${APP}/(features|services)/` }
    },
    {
      name: 'no-circular',
      comment: 'Cycles are forbidden throughout the application architecture.',
      severity: 'error',
      from: { path: `^${APP}/` },
      to: { circular: true }
    }
  ],

  options: {
    doNotFollow: { path: 'node_modules' },

    exclude: {
      path: ['\\.test\\.js$', '\\.fit\\.spec\\.js$', '/fit/', '\\.njk$']
    },

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },

    reporterOptions: {
      dot: {
        collapsePattern: `${APP}/(features|services|lib|shared)`
      },
      archi: {
        collapsePattern: `${APP}/(features|services|lib|shared)`
      }
    },

    cache: { strategy: 'metadata' }
  }
}
