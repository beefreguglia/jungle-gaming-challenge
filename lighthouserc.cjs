// Lighthouse CI config. Profile is chosen via LHCI_PRESET=mobile|desktop.
// Runs against the optimized build (`pnpm build`) with the default mock scenario.
const { chromium } = require('@playwright/test')

const preset = process.env.LHCI_PRESET === 'desktop' ? 'desktop' : 'mobile'
const base = 'http://localhost:4174'

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm preview --port 4174 --strictPort',
      startServerReadyPattern: 'Local',
      // Home and NFT detail; keep the detail id in sync with the mock fixtures
      url: [`${base}/`, `${base}/nfts/1`],
      numberOfRuns: 3,
      chromePath: chromium.executablePath(),
      settings: {
        ...(preset === 'desktop' ? { preset: 'desktop' } : {}),
        chromeFlags: '--headless=new --no-sandbox',
      },
    },
    assert: {
      // Assertions run on the median of the 3 runs
      aggregationMethod: 'median-run',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: `reports/lighthouse/${preset}`,
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
}
